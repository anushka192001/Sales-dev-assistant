import threading
import httpx
import json
import os
import asyncio
import inspect
from typing import List, Dict, TypedDict, Annotated
from LLM.system_prompt import get_model_specific_prompt
from LLM.tool_definition import tool_definition
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from mongo_client import MongoClient
from title_generator import TitleGenerator
from tools.search_tool import ContactsSearchTool
from tools.search_company_tool import CompanySearchTool
from tools.generate_email_tool import EmailGeneratorTool
from tools.create_cadence_step_tool import CadenceStepTool
from tools.create_cadence_tool import CadenceTool
from tools.add_contacts_to_cadence_tool import AddContactsToCadenceTool
from enum_matcher import enum_data_loader
from execution_type_analyser import ExecutionPlan, ExecutionTypeAnalyzer, ExecutionStep
import operator
from clodura_client import CloduraClient
from LLM.open_router_client import OpenRouterClient, ResponseFormat
from conversation_compressor import compress_conversation_if_needed


def dedupe_messages_reducer(existing: List[Dict], new: List[Dict]) -> List[Dict]:
    """
    Custom reducer that merges messages while preventing duplicates.
    """
    if not new:  # Nothing to add
        return existing
    # Build a set of existing message identifiers
    existing_ids = set()
    for msg in existing:
        if msg.get("role") == "tool":
            tool_id = msg.get("tool_call_id")
            if tool_id:
                existing_ids.add(f"tool:{tool_id}")
        else:
            existing_ids.add(json.dumps(msg, sort_keys=True))

    # Only add truly new messages
    result = existing.copy()
    for msg in new:
        if msg.get("role") == "tool":
            tool_id = msg.get("tool_call_id")
            msg_id = f"tool:{tool_id}" if tool_id else None
        else:
            msg_id = json.dumps(msg, sort_keys=True)
        if msg_id and msg_id not in existing_ids:
            result.append(msg)
            existing_ids.add(msg_id)
    return result


class AgentState(TypedDict):
    """State for the LangGraph agent"""

    messages: Annotated[List[Dict], dedupe_messages_reducer]
    session_id: str
    tool_outputs: Annotated[List[Dict], operator.add]
    final_result: Dict
    execution_plan: ExecutionPlan
    completed_steps: Annotated[List[str], operator.add]
    step_results: Dict
    execution_progress: Dict
    model: str
    plan_id: str


class LangGraphSalesAgent:
    """
    LangGraph-based Sales Development Assistant with tool calling support and memory management
    """

    def __init__(
        self,
        openrouter_api_key: str = None,
        clodura_token: str = None,
        clodura_base_url: str = "https://app.clodura.ai",
        mongo_connection_url: str = "mongodb://host.docker.internal:27017",
    ):
        self.api_key = openrouter_api_key or os.getenv("OPENROUTER_API_KEY")
        # Ideally, this should come from auth layer, but its hardcoded for development.
        self.clodura_token = clodura_token or os.getenv("CLODURA_TOKEN")
        self.user_id = "68c3e69d279836869a68f526"
        if not self.api_key:
            raise ValueError(
                "OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or pass it directly."
            )

        if not self.clodura_token:
            raise ValueError(
                "Clodura token is required. Set CLODURA_TOKEN environment variable or pass it directly."
            )

        self.mongo_client = MongoClient(
            connection_string=mongo_connection_url,
            db_name="ai-sdr",
            open_router_logs_collection="llm_requests",
            conversations_collection="conversations",
        )
        self.clodura_client = CloduraClient(
            clodura_base_url, clodura_token, self.user_id, self.mongo_client
        )

        self.search_client = CloduraClient(
            "http://10.122.0.25:5025",
            "wl1df8mLii6nMjc9LlzSSTxpJkUPP9OM",
            self.user_id,
            self.mongo_client,
        )

        # Get log level from environment, default to INFO
        log_level = os.getenv("LLM_LOG_LEVEL", "INFO").upper()

        self.openrouter_client = OpenRouterClient(
            api_key=openrouter_api_key or os.getenv("OPENROUTER_API_KEY"),
            enable_logging=True,
            log_level=log_level,
            mongo_logger=self.mongo_client,
        )
        self.title_generator = TitleGenerator(llm_client=self.openrouter_client)

        # Initialize tools
        self.search_tool = ContactsSearchTool(
            self.user_id, clodura_client=self.clodura_client
        )
        self.company_search_tool = CompanySearchTool(
            self.user_id, clodura_client=self.clodura_client
        )
        self.email_generator_tool = EmailGeneratorTool(
            client=self.openrouter_client,
            model="mistralai/mistral-small-3.2-24b-instruct",
        )
        self.cadence_step_tool = CadenceStepTool(
            self.user_id, clodura_client=self.clodura_client
        )

        self.cadence_tool = CadenceTool(
            self.user_id, clodura_client=self.clodura_client
        )
        self.add_contacts_to_cadence_tool = AddContactsToCadenceTool(
            self.user_id, clodura_client=self.clodura_client
        )
        self.enum_data = enum_data_loader()

        self.tool_registry = {
            "search_leads": self.search_tool.search_leads,
            "search_companies": self.company_search_tool.search_companies,
            "create_cadence": self.cadence_tool.create_cadence,
            "generate_email": self.email_generator_tool.generate_email,
            "add_contacts_to_cadence": self.add_contacts_to_cadence_tool.add_contacts_to_cadence,
        }

        # Initialize execution type analyzer
        self.execution_analyzer = ExecutionTypeAnalyzer(self.openrouter_client)
        # Memory management: session_id -> conversation data
        self.memory = {}
        self.max_conversation_length = 100

        self.tools = tool_definition

        # Build the workflow
        self.workflow = self._build_workflow()

    def _build_workflow(self):
        """Build the LangGraph workflow for dynamic execution."""
        workflow = StateGraph(AgentState)

        # Add nodes
        workflow.add_node("agent", self._agent_node)
        workflow.add_node("plan_execution", self._plan_execution_node)
        workflow.add_node("review_plan", self._review_plan_node)
        workflow.add_node("execute_step", self._execute_step_node)
        workflow.add_node("check_completion", self._check_completion_node)
        workflow.add_node("respond", self._respond_node)
        # Define edges
        workflow.set_entry_point("agent")

        workflow.add_conditional_edges(
            "agent",
            self._should_create_plan,
            {"plan": "plan_execution", "respond": "respond"},
        )
        # Direct flow from plan_execution to review_plan (interrupt-based)
        workflow.add_edge("plan_execution", "review_plan")

        # With interrupts, review_plan always flows to execute_step
        workflow.add_edge("review_plan", "execute_step")

        workflow.add_conditional_edges(
            "execute_step",
            self._should_continue_execution,
            {
                "continue": "execute_step",  # Loop back to execute the next set of ready steps
                "complete": "check_completion",  # Move on when all steps are done
            },
        )

        workflow.add_edge("check_completion", "respond")
        workflow.add_edge("respond", END)

        # Compile with checkpointer to enable interrupts
        checkpointer = MemorySaver()
        return workflow.compile(
            checkpointer=checkpointer,
            interrupt_before=[
                "review_plan"
            ],  # Static interrupt before review_plan node
        )

    async def _agent_node(self, state: AgentState) -> AgentState:
        """
        Refactored agent node focusing on its core responsibility:
        deciding the next action based on the current conversation state.
        """
        session_id = state["session_id"]
        print(f"state--->{state}")
        model = state.get('model','openai/gpt-4o-mini')
        api_messages = self._prepare_llm_messages(state)
        # 3. Handle conversation compression cleanly.
        api_messages, _ = await compress_conversation_if_needed(
            api_messages, session_id, self.openrouter_client
        )
        # Enhanced LLM input logging
        try:
            # 4. Use a deterministic temperature for reliable tool calling.
            response = await self.openrouter_client.chat_completion(
                session_id=session_id,
                purpose="agent",
                messages=api_messages,
                model=model,
                tools=self.tools,
                temperature=0.1,  # Use a low temperature for predictable planning
            )

            assistant_message = response["choices"][0]["message"]
            # 5. Normalize the response for LangGraph.
            cleaned_message = self._normalize_assistant_message(assistant_message)
            result = {"messages": [cleaned_message]}
            if "plan_id" in state:
                result["plan_id"] = state["plan_id"]
            return result

        except httpx.RequestError as e:
            print(f"🌐 Network error in agent_node: {e}")
            result = {
                "messages": [
                    {
                        "role": "assistant",
                        "content": "A network error occurred. Please try again.",
                    }
                ]
            }
            if "plan_id" in state:
                result["plan_id"] = state["plan_id"]
            return result
        except Exception as e:
            print(f"❌ Unexpected error in agent_node: {e}")
            result = {
                "messages": [
                    {
                        "role": "assistant",
                        "content": "An unexpected error occurred. Please try again.",
                    }
                ]
             
            }
            if "plan_id" in state:
                result["plan_id"] = state["plan_id"]
            
            return result

    def _prepare_llm_messages(self, state: AgentState) -> List[Dict]:
        """
        Constructs a valid message list for the LLM API, handling all message sequences correctly.

        This function guarantees a valid message order by:
        1.  Using `state['messages']` for the primary conversation flow.
        2.  Using the database as the authoritative source for all `tool_outputs`.
        3.  Ignoring 'tool' messages from the state to prevent duplication.
        4.  Injecting tool results from the DB after the corresponding 'assistant' message.
        5.  **Critically, inserting a "bridging" assistant message if a 'user' message
            would otherwise follow a 'tool' message.**
        """
        session_id = state["session_id"]
        messages_in_state = state["messages"]
        model = state.get("model",'openai/gpt-4o-mini')

        # 1. Load the complete history of tool outputs from the database.
        conversation_data = self.mongo_client.load_conversation_with_tool_outputs(
            self.user_id, session_id
        )
        all_tool_outputs_from_db = conversation_data.get("tool_outputs", [])

        # 2. Create a lookup map of tool call IDs to their results.
        tool_output_map = {
            output["tool_call_id"]: output["result"]
            for output in all_tool_outputs_from_db
            if "tool_call_id" in output
        }

        # 3. Start building the final, correctly ordered message list.
        api_messages = [{"role": "system", "content": get_model_specific_prompt(model)}]

        # 4. Iterate through the message history from the state to build the final list.
        for msg in messages_in_state:
            # Skip any 'tool' messages from the state list. We will create them fresh.
            if msg.get("role") == "tool":
                continue

            if msg.get("role") == "user" and msg.get("content", "").startswith(
                ("APPROVE_PLAN:", "EDIT_PLAN:")
            ):
                continue

            # Before adding a user message, check if the last message in our list was a tool message.
            if msg.get("role") == "user":
                if api_messages and api_messages[-1].get("role") == "tool":
                    # If so, insert the required bridging assistant message.
                    api_messages.append(
                        {
                            "role": "assistant",
                            "content": "I have completed the actions. What would you like to do next?",
                        }
                    )

            # Now, add the current message (user or assistant) from the state.
            api_messages.append(msg)

            # If the message we just added was an assistant message with tool calls,
            # append the corresponding tool results from our database map.
            if msg.get("role") == "assistant" and msg.get("tool_calls"):
                for tool_call in msg.get("tool_calls", []):
                    tool_call_id = tool_call.get("id")
                    result = tool_output_map.get(tool_call_id)

                    # Detect if this is a system-generated tool call
                    is_system_generated = tool_call_id.startswith("auto_")

                    if result is not None:
                        tool_message = {
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "content": json.dumps(result),
                        }

                        # # Add source metadata for system-generated tool calls
                        # if is_system_generated:
                        #     tool_message["source"] = "system"

                        api_messages.append(tool_message)
                    else:
                        print(
                            f"Warning: Tool output for tool_call_id '{tool_call_id}' not found in DB."
                        )
                        error_tool_message = {
                            "role": "tool",
                            "tool_call_id": tool_call_id,
                            "content": json.dumps(
                                {
                                    "error": f"Result for {tool_call_id} not found in database."
                                }
                            ),
                        }

                        # # Add source metadata for system-generated tool calls
                        # if is_system_generated:
                        #     error_tool_message["source"] = "system"

                        api_messages.append(error_tool_message)

        return api_messages

    def _normalize_assistant_message(self, assistant_message: Dict) -> Dict:
        """Cleans and standardizes the LLM response message."""
        ALLOWED_KEYS = {"role", "content", "tool_calls"}

        # Filter for allowed keys to prevent schema errors
        cleaned_message = {
            k: v for k, v in assistant_message.items() if k in ALLOWED_KEYS
        }

        # Ensure 'content' field exists, as it's required by some standards,
        # especially when tool calls are present.
        if cleaned_message.get("tool_calls") and "content" not in cleaned_message:
            cleaned_message["content"] = ""

        return cleaned_message

    async def _plan_execution_node(self, state: AgentState) -> AgentState:
        """
        Creates an execution plan based on tool calls from the LLM.
        This node now includes a crucial preprocessing step to validate and
        map tool arguments before creating the final plan.
        """
        # Creating execution plan
        assistant_message = state["messages"][-1]
        session_id = state["session_id"]
        raw_tool_calls = assistant_message.get("tool_calls", [])

        # Get context from previous tool outputs for missing tools analysis
        context_info = self._build_context_from_history(session_id)

        if not raw_tool_calls:
            # No tool calls to process
            return {"execution_plan": None}

        user_message = next(
            (m["content"] for m in reversed(state["messages"]) if m["role"] == "user"),
            "",
        )

        for i, call in enumerate(raw_tool_calls):
            tool_name = call.get("function", {}).get("name", "unknown")
            print(f"🟡   {i+1}. {tool_name}")

        # # Should we add missing tools args too here?
        missing_analysis = await self.execution_analyzer._check_missing_tools(
            session_id, user_message, raw_tool_calls, context_info
        )

        if missing_analysis.get("has_missing_tools", False):
            missing_tools = missing_analysis.get("missing_tools", [])
            print(f"🟡 Missing tools to add: {missing_tools}")

            # Get existing tool names to prevent duplicates
            existing_tool_names = [
                call.get("function", {}).get("name") for call in raw_tool_calls
            ]
            print(f"🟡 Existing tools: {existing_tool_names}")

            # Generate missing tool calls, but only if they don't already exist
            additional_tool_calls = []
            for tool_name in missing_tools:
                if tool_name not in existing_tool_names:
                    # Create a basic tool call for each missing tool
                    tool_call = {
                        "id": f"auto_{tool_name}_{len(raw_tool_calls)}",
                        "type": "function",
                        "function": {
                            "name": tool_name,
                            "arguments": self._generate_default_args_for_tool(
                                tool_name, user_message, context_info
                            ),
                        },
                        "source": "system",  # Mark as system-generated
                    }
                    additional_tool_calls.append(tool_call)
                    print(f"🟡   Added: {tool_name} with auto-generated args")

            # Merge with existing tool calls
            raw_tool_calls.extend(additional_tool_calls)
            print(
                f"🟡 ✅ Extended tool calls from {len(raw_tool_calls) - len(additional_tool_calls)} to {len(raw_tool_calls)}"
            )

            # Update the assistant message in state with extended tool calls
            updated_messages = state["messages"].copy()
            for i, msg in enumerate(updated_messages):
                if msg.get("role") == "assistant" and msg.get("tool_calls"):
                    # This is the last assistant message with tool calls
                    updated_messages[i] = {**msg, "tool_calls": raw_tool_calls}
                    break

            # Add system message to inform about system-generated tool calls
            system_message = {
                "role": "system",
                "content": f"System automatically detected and added {len(additional_tool_calls)} missing tool call(s) to complete the workflow: {', '.join(missing_tools)}. These system-generated tool calls ensure proper workflow execution and dependency handling.",
            }
            updated_messages.append(system_message)
        else:
            print(f"🟡 ✅ No missing tools - proceeding with execution plan")
            updated_messages = state["messages"]  # No changes needed

        preprocessed_tools = []
        for i, tool_call in enumerate(raw_tool_calls):
            try:
                tool_name = tool_call["function"]["name"]
                original_args = json.loads(tool_call["function"]["arguments"])
                preprocessed_args = await self._preprocess_tool_args(
                    session_id, tool_name, original_args
                )
                # print(f"🔧   After preprocessing: {preprocessed_args}")

                preprocessed_tools.append(
                    {
                        "tool_call": tool_call,
                        "tool_name": tool_name,
                        "preprocessed_args": preprocessed_args,
                    }
                )

            except json.JSONDecodeError as e:
                print(
                    f"🔧   ❌ JSON Error processing tool call arguments: {e}. Skipping call."
                )
                continue  # Skip this broken tool call
            except Exception as e:
                print(f"🔧   ❌ Error preprocessing {tool_call}: {e}")
                # Keep original for batch validation
                preprocessed_tools.append(
                    {
                        "tool_call": tool_call,
                        "tool_name": tool_call["function"]["name"],
                        "preprocessed_args": json.loads(
                            tool_call["function"]["arguments"]
                        ),
                    }
                )

        # Step 2: Batch LLM validation (single LLM call for all tools)
        # COMMENTED OUT: Batch validation step to reduce latency
        # print(f"🔧 === BATCH LLM VALIDATION ===")
        # validated_tools = await self._batch_validate_arguments(
        #     session_id, preprocessed_tools, user_message, state["messages"]
        # )

        # Skip batch validation for now - use preprocessed tools directly
        validated_tools = []
        for tool in preprocessed_tools:
            # Apply parameter corrections without LLM validation
            final_args = self._validate_and_filter_tool_args(
                tool["tool_name"], tool["preprocessed_args"]
            )
            validated_tools.append(
                {
                    "tool_call": tool["tool_call"],
                    "tool_name": tool["tool_name"],
                    "final_args": final_args,
                }
            )

        processed_tool_calls = []
        for i, validated_tool in enumerate(validated_tools):
            try:
                updated_call = validated_tool["tool_call"].copy()
                updated_call["function"]["arguments"] = json.dumps(
                    validated_tool["final_args"]
                )
                processed_tool_calls.append(updated_call)
                print(f"🔧 Tool {i+1} final args: {validated_tool['final_args']}")
            except Exception as e:
                print(f"🔧   ❌ Error creating final tool call: {e}")
                processed_tool_calls.append(validated_tool["tool_call"])

        # Pass the cleaned and validated tool calls to the plan creation logic
        execution_plan = await self._create_execution_plan(
            session_id, processed_tool_calls, state["messages"]
        )

        print(f"\n📋 Execution Plan Summary")
        print(f"──────────────────────────────")
        print(f"Execution Type: {execution_plan.execution_type}")
        print(f"Total Steps   : {len(execution_plan.steps)}\n")

        for idx, step in enumerate(execution_plan.steps):
            print(f"🔹 Step {idx+1} — {step.step_id}")
            print(f"    🛠  Tool Name          : {step.tool_name}")
            print(f"    📦 Tool Arguments     :")
            print(json.dumps(step.tool_args, indent=6))
            print(f"    📃 Description        : {step.description}")
            print(
                f"    🔗 Depends On         : {step.depends_on if step.depends_on else 'None'}"
            )
            print(f"    ♻️  Uses Prev Results : {step.use_previous_results}")
            print("──────────────────────────────")

        plan_id = state.get("plan_id") or state.get("plan_id")
        if not plan_id:
            import time
            import uuid

            plan_id = f"plan_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            print(f"🔧 Fallback: Generated plan ID: {plan_id}")
        else:
            print(f"🆔 Using pre-generated plan ID: {plan_id}")

        # Add plan_id to the execution plan object
        execution_plan_dict = execution_plan.to_serializable()
        execution_plan_dict["plan_id"] = plan_id

        return {
            "execution_plan": execution_plan_dict,  # Serialize for LangGraph state
            "plan_id": plan_id,  # Track current plan
            "completed_steps": [],
            "step_results": {},
            "messages": updated_messages,  # Include updated messages with system-generated tool info
            "execution_progress": {
                "status": "planned",
                "message": f"Created execution plan with {len(execution_plan.steps)} steps",
                "plan_id": plan_id,
            },
        }

    def _validate_and_filter_tool_args(self, tool_name: str, args: Dict) -> Dict:
        """
        Validates and filters tool arguments to only include allowed parameters.
        Removes any unexpected or invalid arguments and handles common mistakes.
        """
        # Define allowed parameters for each tool
        allowed_params = {
            "search_leads": {
                "companyName",
                "industry",
                "speciality",
                "size",
                "revenue",
                "fundingType",
                "fundingMinDate",
                "fundingMaxDate",
                "fullName",
                "seniority",
                "functionalLevel",
                "designation",
                "country",
                "state",
                "city",
                "companyIds",
                "isFilter",
                "limit",
            },
            "search_companies": {
                "companyName",
                "hqCountry",
                "hqState",
                "hqCity",
                "industry",
                "company_type",
                "hiringAreas",
                "speciality",
                "size",
                "revenue",
                "websiteKeywords",
                "techParams",
                "langTechOs",
                "websiteList",
                "uniqueCompanies",
                "excludeWebList",
                "funding",
                "fundingType",
                "fundingMinDate",
                "fundingMaxDate",
                "contentSearch",
                "partnerIntent",
                "lockedCompany",
                "correspondence",
                "boardline",
                "exclude_companies",
                "limit",
                "start",
                "sort",
            },
            "generate_email": {"tone", "email_type", "purpose", "example"},
            "create_cadence": {
                "name",
                "cadence_type",
                "recipients",
                "tags",
                "start_date",
                "start_time",
                "white_days",
                "is_active",
                "status",
                "template_details"
            },
            "add_contacts_to_cadence": {"name", "recipients_ids", "cadence_id"},
        }

        # Common parameter mapping for mistakes Mistral might make
        param_corrections = {
            "search_leads": {
                "location": "city",  # Mistral often uses "location" instead of "city"
                "company_size": "size",
                "job_title": "designation",
                "jobTitle": "designation",
                "department": "functionalLevel",
                "position": "designation",
                "company_name": "companyName",
                "role": "designation",
                "job_function": "functionalLevel",
            },
            "search_companies": {
                "location": "hqCity",
                "company_size": "size",
                "company_name": "companyName",
                "headquarters": "hqCity",
                "hq_country": "hqCountry",
                "hq_state": "hqState",
                "hq_city": "hqCity",
            },
        }

        if tool_name not in allowed_params:
            print(f"⚠️ Unknown tool: {tool_name}, returning original args")
            return args

        allowed = allowed_params[tool_name]
        corrections = param_corrections.get(tool_name, {})
        filtered_args = {}
        removed_params = []
        corrected_params = []

        for key, value in args.items():
            if key in allowed:
                # Direct match - use as-is
                filtered_args[key] = value
            elif key in corrections:
                # Apply correction
                correct_key = corrections[key]
                filtered_args[correct_key] = value
                corrected_params.append(f"{key} -> {correct_key}")
            else:
                # Invalid parameter - remove it
                removed_params.append(key)

        if removed_params:
            print(
                f"🔒 Filtered out invalid parameters for {tool_name}: {removed_params}"
            )
        if corrected_params:
            print(f"🔧 Auto-corrected parameters for {tool_name}: {corrected_params}")

        return filtered_args

    async def _preprocess_tool_args(
        self, session_id: str, tool_name: str, original_args: Dict
    ) -> Dict:
        """
        Helper function that preprocesses arguments for search tools by mapping
        user-friendly terms to valid API enum values.
        """
        # First, validate and filter arguments
        validated_args = self._validate_and_filter_tool_args(tool_name, original_args)

        # This function only applies to search_leads and search_companies
        if tool_name not in ["search_leads", "search_companies"]:
            return validated_args

        # Preprocessing arguments
        # Original arguments processed

        try:
            valid_enums = self.enum_data
            # Identify which fields in the current tool call need enum mapping
            fields_to_map = {
                field: {
                    "user_values": values,
                    "valid_values": valid_enums.get(field, []),
                }
                for field, values in validated_args.items()
                # Ensure the field is mappable and the user provided values
                if field in valid_enums and isinstance(values, list) and values
            }

            if not fields_to_map:
                # No enum mapping required
                return validated_args

            # Call your enhanced mapping function
            mapped_args = await self._enhanced_parameter_mapping(
                session_id, fields_to_map
            )

            if mapped_args is None:
                # Mapping failed - using validated arguments
                return validated_args

            # Merge mapped results with validated args that were not processed
            final_args = validated_args.copy()
            final_args.update(mapped_args)
            # Arguments processed successfully
            return final_args

        except Exception as e:
            # Error during preprocessing
            # In case of a critical error, return the validated arguments
            return validated_args

    async def _enhanced_parameter_mapping(
        self, session_id: str, fields_to_map: dict
    ) -> dict:
        """Unified parameter mapping with Mistral primary, Claude fallback"""

        prompt_parts = [
            "You are a precise parameter mapping expert for a professional contact and company search system.",
            "Map user-provided search terms to valid enum values from our database.",
            "",
            "CRITICAL RULES:",
            "1. ONLY return values that exist in the provided valid_values lists",
            "2. If no valid mapping exists for a field, omit that field entirely",
            "3. Be conservative - better to omit than to guess incorrectly",
            "4. Return empty array [] if no valid matches found for a field",
            "5. Treat Bangalore and Bengaluru as the same",
            '6. For "decision makers", map to seniority: ["CEO", "CTO", "CFO", "CMO", "COO", "CXO", "President", "Founder", "Vice President", "Director"]',
            "7. For 'procurement', map to functionalLevel: ['Purchase']",
            "8. For company searches: use hqCity, hqState, hqCountry",
            "9. For contact searches: use city, state, country",
            "10. If multiple relevant values exist, return all of them",
            "11. If you find abbreviations like BFSI, F&B in industry term, you must map them against their full forms"
            "",
            "FIELD MAPPING TASKS:",
        ]

        # Add field-specific mapping instructions
        for field, mapping_info in fields_to_map.items():
            user_values = mapping_info["user_values"]
            valid_values = mapping_info["valid_values"]

            prompt_parts.extend(
                [
                    f"\n--- {field.upper()} MAPPING ---",
                    f"User Input: {user_values}",
                    f"Valid Options: {valid_values}",
                    f"Task: Map user terms to valid {field} options",
                ]
            )

            field_examples = self._generate_field_examples(field)
            if field_examples:
                prompt_parts.append(f"Examples: {field_examples}")

        prompt_parts.extend(
            [
                "",
                "OUTPUT FORMAT:",
                "Return ONLY valid JSON. No markdown, no explanatory text.",
                'Example: {"seniority": ["CEO", "CTO"], "industry": ["Technology"]}',
                "",
                "Remember: Only include fields where you found valid matches",
            ]
        )

        unified_prompt = "\n".join(prompt_parts)

        # Try with Mistral first (faster), then Claude fallback (reliable)
        response = await self.openrouter_client.chat_completion_with_retries(
            session_id=session_id,
            purpose="parameter_mapping",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise parameter mapping expert. Follow instructions exactly and return only valid JSON.",
                },
                {"role": "user", "content": unified_prompt},
            ],
            model_preference_list=[
                "openai/gpt-4o-mini",  # Additional fall
                "anthropic/claude-3.5-sonnet",  # Claude (reliable fallback)
            ],
            response_format=ResponseFormat.JSON,
            temperature=0.0,
            max_tokens=1000,
            max_retries_per_model=1,
        )

        if response:
            try:
                content = self.openrouter_client.extract_content(response)
                if content and content.strip():
                    mapped = self._normalize_keys_and_values(json.loads(content))
                    return mapped
            except Exception as e:
                pass

        # All models failed for parameter mapping
        return None

    # Helper method to generate examples for the mapping prompt
    def _generate_field_examples(self, field_key: str) -> str:
        """Generates dynamic examples for the specific parameter mapping fields"""
        examples = {
            "seniority": 'e.g., "C-level executives" -> ["CEO", "CXO"], "senior management" -> ["Director", "Vice President"]',
            "size": 'e.g., "small companies" -> ["2 - 10", "11 - 50"], "enterprise" -> ["1001 - 5000", "5001+"]',
            "functionalLevel": 'e.g., "sales people" -> ["Sales"], "procurement team" -> ["Purchase"], "HR professionals" -> ["Human Resources"]',
            "revenue": 'e.g., "high revenue companies" -> ["$100M - $500M", "$500M - $1B"], "startups" -> ["$1M - $10M"]',
            "fundingType": 'e.g., "venture backed" -> ["Venture Capital"], "bootstrapped" -> ["Self Funded"]',
            "hiringAreas": 'e.g., "tech roles" -> ["Engineering", "Product"], "business roles" -> ["Sales", "Marketing"]',
            "company_types": 'e.g., "tech companies" -> ["Technology"], "consulting firms" -> ["Consulting"]',
            "industry": 'e.g., "ITES" -> ["IT Services and IT Consulting"], "BFSI" -> ["Banking", "Financial Services", "Insurance"], "F&B" -> ["Food and Beverages"], "fintech" -> ["Financial Services", "Technology"], "edtech" -> ["Education", "Technology"], "healthcare" -> ["Hospitals and Health Care", "Medical Devices"], "pharma" -> ["Pharmaceutical Manufacturing"], "retail" -> ["Retail"], "ecommerce" -> ["Internet Retail"], "manufacturing" -> ["Manufacturing"], "automotive" -> ["Motor Vehicle Manufacturing"], "real estate" -> ["Real Estate"]',
        }
        return examples.get(field_key, "")

    def _normalize_keys_and_values(self, mapped: dict) -> dict:
        """Normalize keys and expand values with synonyms"""
        # Data processed before normalization
        expected_keys = {
            "size": "size",
            "seniority": "seniority",
            "functionallevel": "functionalLevel",
            "functionalLevel": "functionalLevel",
            "revenue": "revenue",
            "fundingtype": "fundingType",
            "fundingType": "fundingType",
            "hiringareas": "hiringAreas",
            "hiringAreas": "hiringAreas",
            "company_types": "company_types",
            "companytypes": "company_types",
            "companyTypes": "company_types",
        }

        # Value synonyms - bidirectional mapping
        synonyms = {
            "bangalore": "bengaluru",
            "bengaluru": "bangalore",
            "bombay": "mumbai",
            "mumbai": "bombay",
            "calcutta": "kolkata",
            "kolkata": "calcutta",
            "madras": "chennai",
            "chennai": "madras",
        }

        normalized = {}

        for k, v in mapped.items():
            # Normalize key
            key_norm = expected_keys.get(k.lower()) or expected_keys.get(k)
            if not key_norm:
                continue

            # Ensure value is list
            values = v if isinstance(v, list) else [v]

            # Expand values with synonyms
            expanded = set(values)
            for val in values:
                if isinstance(val, str) and val.lower() in synonyms:
                    expanded.add(synonyms[val.lower()])

            # Merge with existing or set new
            if key_norm in normalized:
                normalized[key_norm].update(expanded)
            else:
                normalized[key_norm] = expanded

        # Convert sets back to lists
        return {k: list(v) for k, v in normalized.items()}

    def _normalize_keys_and_values(self, mapped: dict) -> dict:
        """Ensure mapped keys follow expected schema casing and remove invalid keys"""
        expected_keys = {
            "industry": "industry",
            "city": "city",
            "hqcity": "hqCity",
            "hqstate": "hqState",
            "hqcountry": "hqCountry",
            "size": "size",
            "seniority": "seniority",
            "designation": "designation",
            "functionallevel": "functionalLevel",
            "functionalLevel": "functionalLevel",
            "location": "location",
            "company_type": "company_type",
            "companytype": "company_type",
            "speciality": "speciality",
            "revenue": "revenue",
            "fundingtype": "fundingType",
            "fundingType": "fundingType",
        }

        normalized = {}
        for k, v in mapped.items():
            key_norm = expected_keys.get(k)
            if key_norm:
                # Merge values if already exists
                if key_norm in normalized:
                    normalized[key_norm].extend(v)
                else:
                    normalized[key_norm] = v

        # Deduplicate list values
        for k in normalized:
            normalized[k] = list(set(normalized[k]))

        return normalized

    # Whats the use case of this return statement?
    async def _review_plan_node(self, state: AgentState) -> AgentState:
        """Review node that uses LangGraph interrupt for clean human-in-the-loop approval."""
        execution_plan = state.get("execution_plan")
        session_id = state["session_id"]
        if not execution_plan:
            print("📋 No execution plan found, skipping review")
            return {}
        print("📋 Plan Review: Using LangGraph interrupt for human approval...")
        # execution_plan is already in serializable dict format
        plan_data = execution_plan
        # Create the plan review event for frontend (maintaining compatibility)
        plan_id = state.get("plan_id")  # Get plan_id from state
        plan_review_event = {
            "type": "plan_review",
            "plan": plan_data,
            "message": "Please review and approve/edit the execution plan",
            "session_id": session_id,
            "plan_id": plan_id,  # Include plan_id for frontend
        }
        print("📋 Static interrupt will pause before this node...")
        # With static interrupts, the workflow pauses BEFORE this node executes
        # We just need to prepare and return the plan data for streaming
        # The approval/editing logic will be handled when the workflow resumes
        return {
            "plan_review_event": plan_review_event,
        }

    async def _execute_step_node(self, state: AgentState) -> AgentState:
        """Executes all ready steps in a batch, enabling parallel execution."""
        print("⚡ Executing step(s)")
        execution_plan_data = state["execution_plan"]
        print(f"{execution_plan_data}")
        completed_steps = state.get("completed_steps", [])
        step_results = state.get("step_results", {})
        session_id = state.get("session_id", "default-session")
        if not execution_plan_data:
            return state

        # Deserialize execution plan from state
        execution_plan = ExecutionPlan.from_serializable(execution_plan_data)
        ready_steps = execution_plan.get_ready_steps(completed_steps)
        if not ready_steps:
            # No ready steps to execute
            return state

        print(f"⚡ Found {len(ready_steps)} ready steps to execute in this batch.")
        tool_outputs_for_this_turn = []
        newly_completed_steps = []

        for current_step in ready_steps:
            progress = {
                "status": "executing",
                "step_id": current_step.step_id,
                "description": current_step.description,
            }

            try:
                # Prepare args, which might raise an exception if a dependency failed
                tool_args = self._prepare_tool_args(current_step, step_results)
                tool_func = self.tool_registry.get(current_step.tool_name)
                if not tool_func:
                    raise ValueError(f"Unknown tool: {current_step.tool_name}")

                # Check if the tool function is async
                if inspect.iscoroutinefunction(tool_func):
                    # Add session_id for email generation tool
                    if current_step.tool_name == "generate_email":
                        tool_args["session_id"] = session_id
                    # Add recipients for add_contacts_to_cadence if missing
                    elif (
                        current_step.tool_name == "add_contacts_to_cadence"
                        and "recipients_ids" not in tool_args
                    ):
                        # Try to get contact IDs from previous search results
                        for step_id, result in step_results.items():
                            if isinstance(result, dict) and "contacts" in result:
                                contact_ids = [
                                    c.get("id")
                                    for c in result.get("contacts", [])
                                    if c.get("id")
                                ]
                                if contact_ids:
                                    tool_args["recipients_ids"] = contact_ids[
                                        :20
                                    ]  # Limit to 20 contacts
                                    break

                    # Filter out invalid parameters using existing validation
                    tool_args = self._validate_and_filter_tool_args(
                        current_step.tool_name, tool_args
                    )
                    result = await tool_func(**tool_args)
                else:
                    # Add session_id for email generation tool
                    if current_step.tool_name == "generate_email":
                        tool_args["session_id"] = session_id
                    # Add recipients for add_contacts_to_cadence if missing
                    elif (
                        current_step.tool_name == "add_contacts_to_cadence"
                        and "recipients_ids" not in tool_args
                    ):
                        # Try to get contact IDs from previous search results
                        for step_id, result in step_results.items():
                            if isinstance(result, dict) and "contacts" in result:
                                contact_ids = [
                                    c.get("id")
                                    for c in result.get("contacts", [])
                                    if c.get("id")
                                ]
                                if contact_ids:
                                    tool_args["recipients_ids"] = contact_ids
                                    break

                    # Filter out invalid parameters using existing validation
                    tool_args = self._validate_and_filter_tool_args(
                        current_step.tool_name, tool_args
                    )
                    result = tool_func(**tool_args)

                # Store successful result
                step_results[current_step.step_id] = result
                progress["status"] = "completed"
                print(f"✅ Step completed: {current_step.step_id}")

                # Check if this search returned empty results and mark dependent searches for skipping
                execution_plan_data = state.get("execution_plan")
                if execution_plan_data:
                    execution_plan = ExecutionPlan.from_serializable(
                        execution_plan_data
                    )
                    self._check_and_skip_empty_searches(
                        current_step, result, execution_plan, completed_steps
                    )

            except Exception as e:
                error_message = f"Step '{current_step.step_id}' failed: {str(e)}"
                print(f"❌ {error_message}")

                # Store error result
                step_results[current_step.step_id] = {
                    "error": error_message,
                    "status": "failed",
                }
                progress["status"] = "failed"
                progress["message"] = str(e)

            finally:
                # CRITICAL: Always mark the step as processed to prevent loops
                newly_completed_steps.append(current_step.step_id)

                # Get current plan ID
                plan_id = state.get("plan_id", "unknown")

                tool_outputs_for_this_turn.append(
                    {
                        "tool_call_id": current_step.tool_call_id,
                        "tool_name": current_step.tool_name,
                        "step_id": current_step.step_id,
                        "result": step_results[current_step.step_id],
                        "description": current_step.description,
                        "plan_id": plan_id,  # Add plan ID for filtering
                    }
                )

        # Create tool result messages for conversation state
        tool_result_messages = []
        for tool_output in tool_outputs_for_this_turn:
            # Create a simple summary for the tool result
            result = tool_output.get("result", {})
            if isinstance(result, dict) and "error" in result:
                content = f"Error: {result['error']}"
            else:
                # Create brief summary using existing method
                summary = self._create_result_summary(result)
                # Convert summary dict to readable string
                if isinstance(summary, dict):
                    summary_parts = []
                    for key, value in summary.items():
                        if key.endswith("_found"):
                            entity = key.replace("_found", "")
                            summary_parts.append(f"{value} {entity}")
                        else:
                            summary_parts.append(f"{key}: {value}")
                    summary_str = (
                        ", ".join(summary_parts) if summary_parts else "completed"
                    )
                else:
                    summary_str = str(summary)
                content = f"Completed {tool_output['tool_name']}: {result}"

            tool_result_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_output["tool_call_id"],
                    "content": content,
                }
            )

        # Note: Assistant acknowledgment now handled by _agent_node bridging logic
        # Don't add assistant message here to avoid duplicates

        print(
            f"🔧 _execute_step_node: Created {len(tool_result_messages)} tool result messages"
        )
        for i, msg in enumerate(tool_result_messages):
            content_preview = (
                msg["content"] + "..." if len(msg["content"]) > 50 else msg["content"]
            )
            tool_id = msg.get("tool_call_id", "no-id")
            print(f"🔧   [{i}] {msg['role']}: {content_preview} | tool_id: {tool_id}")

        print(f"🔧 Returning messages to LangGraph state...")
        print(f"🔧 Total messages being returned: {len(tool_result_messages)}")
        if tool_result_messages:
            last_msg = tool_result_messages[-1]
            print(
                f"🔧 Last message: {last_msg['role']} - {last_msg['content'][:30]}..."
            )

        print(
            f"🔍 DEBUG: _execute_step_node returning {len(tool_outputs_for_this_turn)} tool outputs"
        )

        bridging_assistant_message = {
            "role": "assistant",
            "content": "I have completed the requested actions. What would you like to do next?",
        }

        return {
            "completed_steps": newly_completed_steps,
            "step_results": step_results,
            "tool_outputs": tool_outputs_for_this_turn,
            "messages": tool_result_messages
            + [
                bridging_assistant_message
            ],  # Add tool result messages to conversation (only tool messages now)
        }

    def _check_completion_node(self, state: AgentState) -> AgentState:
        """Checks if the execution plan is complete and aggregates the final results."""
        print("🔍 Checking execution completion")
        execution_plan = state["execution_plan"]

        if not execution_plan:
            return state

        # Deserialize execution plan from state
        execution_plan_obj = ExecutionPlan.from_serializable(execution_plan)

        # Filter completed_steps to only include steps from current plan (same fix as _should_continue_execution)
        completed_steps = state.get("completed_steps", [])
        current_plan_step_ids = {step.step_id for step in execution_plan_obj.steps}
        relevant_completed_steps = [
            step_id for step_id in completed_steps if step_id in current_plan_step_ids
        ]

        if execution_plan_obj.is_complete(relevant_completed_steps):
            print("✅ Execution complete!")
            final_result = self._aggregate_results(
                state["step_results"], execution_plan_obj, state.get("tool_outputs", [])
            )
            return {
                "final_result": final_result,
                "execution_progress": {
                    "status": "completed",
                    "message": f"Successfully completed all steps.",
                },
            }
        else:
            print(
                f"⏳ Execution incomplete: {len(relevant_completed_steps)}/{len(execution_plan_obj.steps)} steps done."
            )
            return {}

    async def _create_execution_plan(
        self, session_id: str, tool_calls: List[Dict], messages: List[Dict]
    ) -> ExecutionPlan:
        """Simplified execution plan creation - let analyzer handle all logic"""
        # Get the last 3 user messages (or fewer if not enough)
        user_messages = [
            msg.get("content", "") for msg in messages if msg.get("role") == "user"
        ]
        # Ensure last_user_messages is a single string (concatenated if multiple)
        last_user_messages = " ".join(user_messages[-3:]) if user_messages else ""

        # Get context from previous tool outputs
        context_info = self._build_context_from_history(session_id)

        # Get analysis from ExecutionTypeAnalyzer
        analysis = await self.execution_analyzer.determine_execution_type(
            session_id, last_user_messages, tool_calls, context_info
        )
        print(f"🧠 Execution type analysis:")
        print(f"   Raw analysis: {json.dumps(analysis, indent=2)}")

        execution_type = analysis.get("execution_type", "parallel")
        dependencies = analysis.get("dependencies", {})

        # Create steps with analyzer-determined dependencies
        steps = []
        for i, tool_call in enumerate(tool_calls):
            step_id = f"step_{i}"
            step_dependencies = dependencies.get(step_id, [])

            # Use previous results if dependencies exist
            use_previous = bool(step_dependencies)

            steps.append(
                ExecutionStep(
                    step_id=step_id,
                    tool_name=tool_call["function"]["name"],
                    tool_call_id=tool_call["id"],
                    tool_args=json.loads(tool_call["function"]["arguments"]),
                    description=f"Execute {tool_call['function']['name']}",
                    depends_on=step_dependencies,
                    use_previous_results=use_previous,
                )
            )

        return ExecutionPlan(
            steps=steps,
            execution_type=execution_type,
            description=f"{execution_type.title()} execution of {len(steps)} steps",
        )

    def _prepare_tool_args(
        self, step: ExecutionStep, step_results: Dict[str, Dict]
    ) -> Dict:
        """Prepares tool arguments, injecting results from previous steps if needed."""
        tool_args = step.tool_args.copy()
        print(f"_prepare_tool_args-->{tool_args}")
        if not step.use_previous_results or not step.depends_on:
            return tool_args

        for dep_step_id in step.depends_on:
            if dep_step_id in step_results:
                dep_result = step_results[dep_step_id]

                # Check if the dependency step failed
                if (
                    isinstance(dep_result, dict)
                    and dep_result.get("status") == "failed"
                ):
                    raise Exception(
                        f"Cannot execute. Dependency '{dep_step_id}' failed."
                    )

                if step.tool_name == "search_leads" and "companies" in dep_result:
                    company_names = [
                        c.get("name")
                        for c in dep_result.get("companies", [])
                        if c.get("name")
                    ]
                    company_ids = [
                        c.get("id")
                        for c in dep_result.get("companies", [])
                        if c.get("id")
                    ]
                    tool_args["companyIds"] = company_ids

                elif step.tool_name == "search_companies" and "contacts" in dep_result:
                    company_names = list(
                        set(
                            c.get("company_name")
                            for c in dep_result.get("contacts", [])
                            if c.get("company_name")
                        )
                    )
                    tool_args["companyName"] = company_names

                elif step.tool_name == "create_cadence":
                    if dep_result.get("body") and dep_result.get("subject"):
                        print(f"substituting content")
                        tool_args["template_details"] = {
                            "body": dep_result["body"],
                            "subject": dep_result["subject"],
                        }
                        print(f"Updated tool_args: {json.dumps(tool_args, indent=2)}")
                        # print(f"Final tool_args: {json.dumps(tool_args, indent=2)}")

                elif step.tool_name == "add_contacts_to_cadence":
                    print(f"🔍 DEBUG add_contacts_to_cadence dependency injection:")
                    print(
                        f"🔍   dep_result keys: {list(dep_result.keys()) if isinstance(dep_result, dict) else 'Not a dict'}"
                    )
                    print(f"🔍   Has cadence_id: {'cadence_id' in dep_result}")
                    print(f"🔍   Has cadence_name: {'cadence_name' in dep_result}")

                    if "cadence_id" in dep_result and "cadence_name" in dep_result:
                        print(f"🔍   ✅ Injecting cadence data from dependency")
                        tool_args["name"] = dep_result["cadence_name"]
                        tool_args["cadence_id"] = dep_result["cadence_id"]
                        print(
                            f"🔍   ✅ Updated tool_args: cadence_id={tool_args['cadence_id']}, name={tool_args['name']}"
                        )
                    else:
                        print(f"🔍   ❌ Missing cadence data in dependency result")
                    # print(
                    #     f"step.tool_name-->{step.tool_name} and tool_args-->{tool_args}"
                    # )

                    if "contacts" in dep_result:
                        print(f"substituting contact ids")
                        contact_ids = list(
                            set(
                                c.get("id")
                                for c in dep_result.get("contacts", [])
                                if c.get("id")
                            )
                        )
                        tool_args["recipients_ids"] = contact_ids
                        # print(f"Final tool_args: {json.dumps(tool_args, indent=2)}")

        # Additional check for add_contacts_to_cadence: look for search_leads results in workflow
        # even if search_leads is not a dependent step
        if step.tool_name == "add_contacts_to_cadence":
            # Check if recipients_ids is missing or not a list of numerical strings
            recipients_ids = tool_args.get("recipients_ids", [])
            needs_contacts = False

            if not recipients_ids:
                needs_contacts = True
                print(
                    f"🔍 recipients_ids is empty, checking for search_leads results in workflow"
                )
            elif not isinstance(recipients_ids, list):
                needs_contacts = True
                print(
                    f"🔍 recipients_ids is not a list, checking for search_leads results in workflow"
                )
            elif not all(
                isinstance(id_val, str) and id_val.isdigit()
                for id_val in recipients_ids
            ):
                needs_contacts = True
                print(
                    f"🔍 recipients_ids contains non-numerical strings, checking for search_leads results in workflow"
                )

            if needs_contacts:
                for step_id, result in step_results.items():
                    if isinstance(result, dict) and "contacts" in result:
                        print(
                            f"🔍 Found contacts in step {step_id}, adding to recipients_ids"
                        )
                        contact_ids = list(
                            set(
                                c.get("id")
                                for c in result.get("contacts", [])
                                if c.get("id")
                            )
                        )
                        tool_args["recipients_ids"] = contact_ids
                        print(
                            f"🔍 Added {len(contact_ids)} contact IDs from workflow step {step_id}"
                        )
                        break  # Use the first search_leads result found

        return tool_args

    # This function is now generic and summarizes any list-based output from a tool.
    def _create_result_summary(self, result: Dict) -> Dict:
        """Creates a brief, generic summary of a tool's output by counting items in lists."""
        if not isinstance(result, dict):
            return {"details": "Result is not a dictionary."}

        summary = {}
        # Generically find any key that holds a list and report its length.
        for key, value in result.items():
            if isinstance(value, list):
                summary[f"{key}_found"] = len(value)

        # Fallback for tools that don't return lists but have a message
        if not summary:
            if "message" in result:
                summary["details"] = result["message"]
            else:
                summary["details"] = "Execution completed."

        return summary

    def _aggregate_results(
        self,
        step_results: Dict[str, Dict],
        execution_plan: ExecutionPlan,
        tool_outputs: List[Dict],
    ) -> Dict:
        """
        Aggregates high-level summaries from all executed steps into a final response,
        leaving detailed data to be derived from the tool_outputs array.
        """
        # CRITICAL FIX: Filter step_results to only include current plan's steps
        current_plan_step_ids = {step.step_id for step in execution_plan.steps}
        filtered_step_results = {
            step_id: result
            for step_id, result in step_results.items()
            if step_id in current_plan_step_ids
        }

        aggregated_summary_data = {}
        summary_phrases = []
        tool_names = []

        # Use filtered_step_results instead of step_results
        for step_id, result in filtered_step_results.items():
            if not isinstance(result, dict):
                continue

            # Create a summary for the current step
            step_summary = self._create_result_summary(result)

            # Add to the overall summary data
            aggregated_summary_data.update(step_summary)

        # Collect tool names from the execution plan for suggestions
        for step in execution_plan.steps:
            tool_names.append(step.tool_name)

        # Create a human-readable message from the summary
        for key, value in aggregated_summary_data.items():
            if key.endswith("_found"):
                entity_name = key.replace("_found", "")
                summary_phrases.append(f"{value} {entity_name}")

        message = f"Completed {len(execution_plan.steps)} steps in {execution_plan.execution_type} mode."
        if summary_phrases:
            message += f" Found: {', '.join(summary_phrases)}."

        # Generate suggested actions based on tools that were executed
        suggested_actions = self._suggest_user_action(tool_names)

        return {
            "type": "tool_response",
            "execution_type": execution_plan.execution_type,
            "message": message,
            "data": aggregated_summary_data,
            "suggested_actions": suggested_actions,
            "tool_outputs": tool_outputs,  # Use all outputs (already isolated by thread_id)
        }

    def _should_create_plan(self, state: AgentState) -> str:
        """Determines whether to create an execution plan or respond directly."""
        assistant_message = state["messages"][-1]
        return "plan" if assistant_message.get("tool_calls") else "respond"

    def _should_continue_execution(self, state: AgentState) -> str:
        """Determains if there are more steps to execute."""
        execution_plan_data = state.get("execution_plan")
        completed_steps = state.get("completed_steps", [])

        if not execution_plan_data:
            print(f"🔍 EXECUTION DEBUG: No execution plan, returning complete")
            return "complete"

        # Deserialize execution plan from state
        execution_plan = ExecutionPlan.from_serializable(execution_plan_data)

        # Filter completed_steps to only include steps from current plan
        current_plan_step_ids = {step.step_id for step in execution_plan.steps}
        relevant_completed_steps = [
            step_id for step_id in completed_steps if step_id in current_plan_step_ids
        ]

        total_steps = len(execution_plan.steps)
        completed_count = len(relevant_completed_steps)

        print(
            f"🔍 EXECUTION DEBUG: Total steps: {total_steps}, Completed (relevant): {completed_count}"
        )
        print(
            f"🔍 EXECUTION DEBUG: All step IDs: {[step.step_id for step in execution_plan.steps]}"
        )
        print(f"🔍 EXECUTION DEBUG: Relevant completed: {relevant_completed_steps}")

        if execution_plan.is_complete(relevant_completed_steps):
            return "complete"

        print(f"🔍 EXECUTION DEBUG: Execution not complete, returning continue")
        return "continue"

    def _respond_node(self, state: AgentState) -> AgentState:
        """Prepares the final response for the user."""
        current_tool_outputs = state.get("tool_outputs", [])
        final_result = state.get("final_result", {})
        if "tool_outputs" in final_result:
            return {
                "final_result": final_result,
                "messages": state["messages"],
            }

        # If no tool was called, create a text response from the last assistant message.
        if not final_result:
            last_assistant_message = next(
                (m for m in reversed(state["messages"]) if m["role"] == "assistant"),
                None,
            )
            print(
                f"🔍 DEBUG: Last assistant message found: {last_assistant_message is not None}"
            )
            if last_assistant_message:
                print(
                    f"🔍 DEBUG: Has tool_calls: {'tool_calls' in last_assistant_message}"
                )
                print(
                    f"🔍 DEBUG: Content preview: {last_assistant_message.get('content', '')[:100]}..."
                )

            if last_assistant_message and "tool_calls" not in last_assistant_message:
                final_result = {
                    "type": "text_response",
                    "tool_name": None,
                    "message": last_assistant_message.get(
                        "content", "I am ready to assist you."
                    ),
                    "data": {},
                    "suggested_actions": [],  # Empty for text responses
                }
            else:  # Fallback if something went wrong
                print("🔍 DEBUG: Using fallback response")
                final_result = {
                    "type": "text_response",
                    "message": "How can I help you further?",
                    "data": {},
                    "suggested_actions": [],  # Empty for text responses
                }

        # Ensure suggested_actions is always present
        if "suggested_actions" not in final_result:
            final_result["suggested_actions"] = []

        print(f"🔍 DEBUG: Final result type: {final_result.get('type')}")
        print(
            f"🔍 DEBUG: Final result has tool_outputs: {'tool_outputs' in final_result}"
        )

        return {
            "final_result": final_result,
            "messages": state["messages"],
        }

    def _initialize_session(self, session_id: str):
        """Initializes a new session if it doesn't exist."""
        if session_id not in self.memory:
            if self.mongo_client:
                session_data = self.mongo_client.load_conversation_with_tool_outputs(
                    self.user_id, session_id
                )
                # Ensure model is set in loaded session data
                if "model" not in session_data:
                    session_data["model"] = ""
                self.memory[session_id] = session_data
            else:
                self.memory[session_id] = {
                    "messages": [],
                    "tool_outputs": [],
                    "title": "New Chat",
                    "model": "",
                }

    def _save_session_to_storage(self, session_id: str):
        """Saves the current session state to the configured storage."""
        session_data = self.memory[session_id]
        if self.mongo_client and session_id in self.memory:
            success = self.mongo_client.save_conversation(
                session_id,
                self.user_id,
                session_data.get("messages", []),
                session_data.get("tool_outputs", []),
                session_data.get("title", "New Chat"),  # Pass the title
            )
            print(
                f"💾 Session '{session_id}' saved: {'Success' if success else 'Failed'}"
            )

    ###Check this from github
    def _build_context_from_history(self, session_id: str) -> Dict:
        """Builds a summary of previous actions to provide context to the agent."""
        MAX_ITEMS_PER_TOOL_CALL = 101
        MAX_TOOL_CALLS_TO_SUMMARIZE = 10
        TRUNCATION_MESSAGE = "...and {} more."

        self._initialize_session(session_id)
        tool_outputs_history = self.memory[session_id].get("tool_outputs", [])
        conversation_history = self.memory[session_id].get("messages", [])

        if not tool_outputs_history:
            return {"context_string": "", "summary_data": {}}

        # Extract original user intent from conversation history
        original_request = ""
        for msg in conversation_history:
            if msg.get("role") == "user" and len(msg.get("content", "")) > 10:
                # Skip plan approval messages to find the original business request
                content = msg.get("content", "")
                if not (
                    content.startswith("APPROVE_PLAN:")
                    or content.startswith("EDIT_PLAN:")
                ):
                    original_request = content
                    break

        context_lines = []
        summary = {
            "company_names": set(),
            "company_ids": set(),
            "contact_company_names": set(),
            "contact_ids": set(),
            "industries": set(),
            "locations": set(),
        }

        tool_calls_summarized = 0
        for tool_output in reversed(tool_outputs_history):
            if tool_calls_summarized >= MAX_TOOL_CALLS_TO_SUMMARIZE:
                break

            tool_name = tool_output.get("tool_name")
            result = tool_output.get("result", {})

            if tool_name in [
                "create_cadence",
                "add_contacts_to_cadence",
                "generate_email",
            ]:
                context_lines.append(f"### Previous Action: '{tool_name}'")

                if tool_name == "generate_email":
                    email_body = result.get("body", "")
                    email_subject = result.get("subject", "")
                    if email_body and email_subject:
                        context_lines.append(
                            f"** Generated email with subject: '{email_subject}'"
                        )
                        context_lines.append(
                            f"** Email body available for campaign use"
                        )
                        summary["email_content"] = {
                            "body": email_body,
                            "subject": email_subject,
                        }

                elif tool_name == "create_cadence":
                    cadence_id = result.get("cadence_id", [])
                    cadence_name = result.get("cadence_name", [])
                    recipients_ids = result.get("recipients", [])
                    this_context = f"** created cadence with {cadence_id} and {cadence_name}. Use both cadence name and id for adding contacts to cadence tool"
                    summary["cadence_id"] = cadence_id
                    summary["cadence_name"] = cadence_name
                    if recipients_ids:
                        
                        this_context += f"and with recipients ids: {recipients_ids}"
                        summary["recipients_ids"] = recipients_ids
                    context_lines.append(this_context)

                elif tool_name == "add_contacts_to_cadence":
                    cadence_id = result.get("cadence_id", [])
                    cadence_name = result.get("cadence_name", [])
                    recipients_ids = result.get("recipients_ids", [])
                    context_lines.append(
                        f"** added recipients with Recipient IDs: {recipients_ids} to cadence with {cadence_id} and {cadence_name}"
                    )
                    summary["cadence_id"] = cadence_id
                    summary["cadence_name"] = cadence_name
                    summary["recipients_ids"] = recipients_ids

                # Continue processing other tools instead of returning early
                tool_calls_summarized += 1
                continue

            if tool_name not in ["search_leads", "search_companies"]:
                tool_calls_summarized += 1
                continue

            context_lines.append(f"### Previous Action: '{tool_name}'")
            contacts = result.get("contacts", [])
            companies = result.get("companies", [])

            if not contacts and not companies:
                context_lines.append("*   No results were found for this action.\n")
                tool_calls_summarized += 1
                continue

            if contacts:
                total = len(contacts)
                context_lines.append(f"*   **Contacts Found:** {total}")
                for c in contacts[:MAX_ITEMS_PER_TOOL_CALL]:
                    # print(f"🤖 Processing contact: {c}")
                    name = c.get("name")
                    title = c.get("designation", "N/A")
                    company = c.get("company_name")
                    contact_id = c.get("id")
                    # Add the actual contact details to the context string
                    if name:
                        context_lines.append(
                            f" Contact ID: {contact_id} - **{name}** ({title} at {company or 'N/A'})"
                        )
                    if contact_id:
                        summary["contact_ids"].add(contact_id)
                    if company:
                        summary["contact_company_names"].add(company)
                if total > MAX_ITEMS_PER_TOOL_CALL:
                    context_lines.append(
                        f"    - {TRUNCATION_MESSAGE.format(total - MAX_ITEMS_PER_TOOL_CALL)}"
                    )

            if companies:
                total = len(companies)
                context_lines.append(f"*   **Companies Found:** {total}")
                for c in companies[:MAX_ITEMS_PER_TOOL_CALL]:
                    name = c.get("name")
                    company_id = c.get("id")
                    industry = c.get("industry", "N/A")
                    # Add the actual company details to the context string
                    if name:
                        context_lines.append(
                            f"    - **{name}** (Industry: {industry}** ID: {company_id})"
                        )
                        summary["company_names"].add(name)
                    if industry:
                        summary["industries"].add(industry)
                    if company_id:
                        summary["company_ids"].add(company_id)

                if total > MAX_ITEMS_PER_TOOL_CALL:
                    context_lines.append(
                        f"    - {TRUNCATION_MESSAGE.format(total - MAX_ITEMS_PER_TOOL_CALL)}"
                    )

            context_lines.append("")
            tool_calls_summarized += 1

        if not context_lines:
            return {"context_string": "", "summary_data": {}}

        # Add completion status and original intent at the beginning
        final_context_lines = []

        if original_request:
            final_context_lines.append("## COMPLETED WORKFLOW SUMMARY")
            final_context_lines.append(f"✅ **Original Request**: {original_request}")
            final_context_lines.append(
                f"✅ **Status**: All requested actions have been completed successfully"
            )
            final_context_lines.append("✅ **Current State**: Ready for new requests")
            final_context_lines.append("")
            final_context_lines.append("## PREVIOUS ACTIONS DETAILS")

        final_context_lines.extend(context_lines)
        # Log the context being built
        context_string = "\n".join(final_context_lines)

        return {
            "context_string": context_string,
            "summary_data": {
                k: list(v) if isinstance(v, set) else v for k, v in summary.items()
            },
        }

    def _stream_progress(
        self, tool_output: dict, node_name: str = "execute_step", status: str = None
    ) -> dict:
        """Helper method to create consistent progress streaming events."""
        if status is None:
            status = (
                "completed"
                if "error" not in tool_output.get("result", {})
                else "failed"
            )

        # Set appropriate message based on status
        if status == "failed":
            message = tool_output.get("result", {}).get("error", "")
        elif status == "running":
            message = f"Executing {tool_output.get('tool_name', 'unknown tool')}"
        else:  # completed
            message = f"Completed {tool_output.get('tool_name', 'unknown tool')}"

        progress_data = {
            "step_id": tool_output.get("step_id"),
            "description": tool_output.get("description", ""),
            "status": status,
            "message": message,
        }

        # Add result summary for completed steps
        if status == "completed":
            result_summary = tool_output.get(
                "summary", {}
            ) or self._create_result_summary(tool_output.get("result", {}))
            if result_summary:
                progress_data["result_summary"] = result_summary

        return {
            "type": "progress",
            "node": node_name,
            "progress": progress_data,
        }

    async def chat(self, message: str, session_id: str = "default", model: str = None):
        """
        Main entry point for interacting with the agent.
        This simplified method uses a single control flow, trusting the checkpointer
        to manage new and resumed conversations.
        """
        self._initialize_session(session_id)
        if model:
            self.memory[session_id]["model"] = model


        # Determine thread_id based on workflow type
        thread_id = session_id  # Default to session_id
        plan_id = None  # Track plan_id for new workflows

        # Determine if we are starting a new flow or resuming a paused one.
        is_resuming = message.startswith("APPROVE_PLAN:") or message.startswith(
            "EDIT_PLAN:"
        )

        if is_resuming:  # Resume workflow
            print(f"🔍 DEBUG: Resume message received: '{message}'")
            if message.startswith("APPROVE_PLAN:"):
                # Extract plan_id from "APPROVE_PLAN:plan_123456_abc" format
                extracted_plan_id = message.replace("APPROVE_PLAN:", "").strip()
                print(f"🔍 DEBUG: Extracted plan_id: '{extracted_plan_id}'")
                if extracted_plan_id and extracted_plan_id.startswith("plan_"):
                    thread_id = extracted_plan_id
                    print(f"🔄 Resuming workflow with plan_id: {extracted_plan_id}")
                else:
                    print(
                        f"❌ DEBUG: Plan_id extraction failed or invalid: '{extracted_plan_id}'"
                    )
            elif message.startswith("EDIT_PLAN:"):
                # Extract plan_id from "EDIT_PLAN:plan_123456_abc:{json}" format
                parts = message.replace("EDIT_PLAN:", "").split(":", 2)
                print(f"🔍 DEBUG: Edit plan parts: {parts}")
                if len(parts) >= 2:
                    extracted_plan_id = parts[0].strip()
                    if extracted_plan_id and extracted_plan_id.startswith("plan_"):
                        thread_id = extracted_plan_id
                        print(
                            f"🔄 Resuming workflow with edited plan_id: {extracted_plan_id}"
                        )
                    else:
                        print(
                            f"❌ DEBUG: Edit plan_id extraction failed: '{extracted_plan_id}'"
                        )
        else:  # New workflow
            # Generate plan_id early for new workflows
            import time
            import uuid

            plan_id = f"plan_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            thread_id = plan_id  # Use plan_id as thread_id from the start
            print(f"🆕 New workflow using plan_id as thread_id: {plan_id}")

        config = {"configurable": {"thread_id": thread_id}}
        print(f"🧵 Using thread_id: {thread_id}")

        if is_resuming:
            if message.startswith("EDIT_PLAN:"):
                try:
                    plan_json = message[10:]
                    edited_plan_data = json.loads(plan_json)
                    self.workflow.update_state(
                        config, {"execution_plan": edited_plan_data}
                    )
                    print("📋 Updated workflow state with edited plan.")
                except Exception as e:
                    yield {"type": "error", "message": f"Invalid plan format: {e}"}
                    return

            # 2. Update the state with the user's new message.
            # This adds the approval/edit message to the history.
            # Also ensure session_id is in state for resuming workflows
            self.workflow.update_state(
                config,
                {
                    "messages": [{"role": "user", "content": message}],
                    "session_id": session_id,
                },
            )

            # 3. Resume the workflow by calling astream with `None` as input.
            # This tells LangGraph to continue from the interruption point using the updated state.
            # It will NOT call the entry point (_agent_node) again.
            inputs = None

        else:
            history = self.memory[session_id].get("messages", []).copy()
            history.append({"role": "user", "content": message})
            if len(history) >= self.max_conversation_length:
                history = history[-self.max_conversation_length :]

            if len(history) >= 3 and self.memory[session_id].get("title") == "New Chat":
                user_messages = [
                    msg["content"] for msg in history if msg["role"] == "user"
                ]
                threading.Thread(
                    target=self._handle_title_update,
                    args=(session_id, user_messages),
                ).start()
                yield {"type": "title_update_triggered", "session_id": session_id}

            # For a new conversation turn, we provide the full initial state.
            inputs = {
                "messages": history,
                "session_id": session_id,
                "tool_outputs": [],
                "completed_steps": [],
                "step_results": {},
                "final_result": {},
                "model": self.memory[session_id].get("model", model),
                "plan_id": plan_id,  # Include plan_id for new workflows
            }

        async for event in self.workflow.astream(inputs, config=config):
            node_name = list(event.keys())[0]
            node_output = event[node_name]

            if "__interrupt__" in event:
                # The workflow has paused for human review.
                print("📋 Workflow interrupted for plan review.")
                current_state = self.workflow.get_state(config)
                plan_data = current_state.values.get("execution_plan")
                if plan_data:
                    # Include plan_id in the review data for frontend reference
                    plan_id = plan_data.get("plan_id") if plan_data else None
                    print(
                        f"🔍 DEBUG: Streaming plan review - plan_id from plan_data: {plan_id}"
                    )
                    review_event = {
                        "type": "plan_review",
                        "plan": plan_data,
                        "plan_id": plan_id,
                        "message": f"Please review and approve/edit the execution plan. (Plan ID: {plan_id})",
                        "session_id": session_id,
                    }
                    print(
                        f"🔍 DEBUG: Final review event structure: {review_event.keys()}"
                    )
                    yield review_event
                # The graph is now paused, waiting for the next `chat` call.

            elif node_name == "execute_step":
                # Stream progress for each tool output from the step.
                tool_outputs = node_output.get("tool_outputs", [])
                print(
                    f"🔍 DEBUG: execute_step node returned {len(tool_outputs)} tool outputs"
                )
                for i, tool_output in enumerate(tool_outputs):
                    print(
                        f"🔍 DEBUG: Streaming tool output {i}: {tool_output.get('tool_name', 'unknown')}"
                    )
                    yield self._stream_progress(tool_output, node_name)

            elif node_name == "respond":
                # The graph has finished. The `final_result` should be complete.
                final_result = node_output.get("final_result", {})

                # Save the final state to memory.
                final_messages = node_output.get("messages", [])
                final_tool_outputs = final_result.get("tool_outputs", [])

                self.memory[session_id]["messages"] = final_messages
                # Overwrite, don't extend, to avoid duplicating outputs
                self.memory[session_id]["tool_outputs"] = final_tool_outputs
                self._save_session_to_storage(session_id)

                yield {"type": "final_result", "result": final_result}
                return  # End of the stream

    def _suggest_user_action(self, tool_names: list) -> List[str]:
        """Suggests follow-up actions based on the tools that were run."""
        suggestions = []
        if tool_names:
            if "search_leads" in tool_names:
                suggestions.extend(
                    [
                        "Add these contacts to a new list",
                        "Start an outreach campaign for these contacts",
                        "Generate personalized emails for these contacts",
                        "Create a cadence for follow-up outreach",
                    ]
                )
            if "search_companies" in tool_names:
                suggestions.extend(
                    [
                        "Find contacts at these companies",
                        "Search for decision makers at these companies",
                        "Generate company-specific outreach emails",
                    ]
                )
            if "generate_email" in tool_names:
                suggestions.extend(
                    [
                        "Create a cadence using this email template",
                        "Search for more contacts to send this email to",
                        "Generate variations of this email",
                    ]
                )
            if "create_cadence" in tool_names:
                suggestions.extend(
                    [
                        "Add more contacts to this cadence",
                        "Monitor cadence performance",
                        "Create similar cadences for other segments",
                    ]
                )
            if "add_contacts_to_cadence" in tool_names:
                suggestions.extend(
                    [
                        "Review and activate the cadence",
                        "Add more contacts to this cadence",
                        "Monitor outreach performance",
                    ]
                )
                
                 
            if "get_verified_email_id_of_contact" in tool_names:
                suggestions.extend(
                    [
                     "get more details of this contact",
                     "create a cadence with this contact",
                    ]
                )
        return list(set(suggestions))

    #     async def _check_conversation_readiness(
    #         self, session_id: str, messages: List[Dict]
    #     ) -> bool:
    #         """
    #         Uses LLM to determine if conversation has enough info to execute workflow
    #         """
    #         try:
    #             # Extract conversation text
    #             conversation_text = []
    #             for msg in messages[-6:]:  # Last 6 messages for context
    #                 role = msg.get("role", "")
    #                 content = msg.get("content", "")
    #                 if content:
    #                     conversation_text.append(f"{role.capitalize()}: {content}")

    #             conversation_str = "\n".join(conversation_text)

    #             analysis_prompt = [
    #                 {
    #                     "role": "system",
    #                     "content": """You are analyzing a sales workflow conversation. Determine if the user has provided enough information to execute their requested workflow.

    # WORKFLOW INDICATORS:
    # - User requests to find companies, contacts, generate emails, create campaigns
    # - User asks for search + outreach automation

    # READINESS INDICATORS:
    # - User provided specific criteria (industry, location, job titles, seniority)
    # - User answered clarification questions
    # - Conversation has sufficient details to proceed

    # Return JSON: {"ready": true/false, "reason": "explanation"}""",
    #                 },
    #                 {
    #                     "role": "user",
    #                     "content": f"Analyze this conversation:\n\n{conversation_str}\n\nIs this ready for workflow execution?",
    #                 },
    #             ]

    #             response = await self.openrouter_client.chat_completion_with_retries(
    #                 session_id=session_id,
    #                 messages=analysis_prompt,
    #                 model_preference_list=[
    #                     "mistralai/mistral-small-3.2-24b-instruct",
    #                     "openai/gpt-4o-mini",
    #                 ],
    #                 response_format=ResponseFormat.JSON,
    #                 temperature=0.1,
    #                 max_retries_per_model=1,
    #             )

    #             if response:
    #                 content = self.openrouter_client.extract_content(response)
    #                 if content and content.strip():
    #                     result = json.loads(content)
    #                     return result.get("ready", False)
    #                 else:
    #                     print(f"🧠 ❌ Empty response content")
    #                     print(f"🧠 Fallback: Not ready")
    #                     return False

    #         except Exception:
    #             # Fallback: assume not ready if analysis fails
    #             pass

    #         return False

    # def _validate_tool_call_response_pairing(self, messages: List[Dict]) -> List[Dict]:
    #     """Ensure every assistant message with tool_calls has corresponding tool results"""
    #     print(f"\n🔍 === TOOL CALL VALIDATION START ===")
    #     print(f"🔍 Node: _agent_node | Validating {len(messages)} messages")

    #     validated_messages = []
    #     pending_tool_calls = {}
    #     tool_calls_found = 0
    #     tool_responses_found = 0

    #     for i, msg in enumerate(messages):
    #         role = msg.get("role", "unknown")
    #         print(f"🔍   Message {i}: {role}")

    #         if msg.get("role") == "assistant" and msg.get("tool_calls"):
    #             tool_calls = msg.get("tool_calls", [])

    #             # Filter out auto-generated tool calls
    #             original_tool_calls = [
    #                 tc for tc in tool_calls if not tc["id"].startswith("auto_")
    #             ]

    #             if original_tool_calls:
    #                 tool_calls_found += len(original_tool_calls)
    #                 print(
    #                     f"🔍     Assistant message with {len(original_tool_calls)} tool calls:"
    #                 )

    #                 # Track tool calls that need responses
    #                 for tool_call in original_tool_calls:
    #                     tool_id = tool_call["id"]
    #                     tool_name = tool_call.get("function", {}).get("name", "unknown")
    #                     pending_tool_calls[tool_id] = tool_call
    #                     print(f"🔍       - {tool_name} (id: {tool_id})")

    #                 # Create message with only original tool calls
    #                 filtered_msg = msg.copy()
    #                 filtered_msg["tool_calls"] = original_tool_calls
    #                 validated_messages.append(filtered_msg)
    #             else:
    #                 # If only auto-generated tool calls, treat as regular assistant message
    #                 filtered_msg = msg.copy()
    #                 if "tool_calls" in filtered_msg:
    #                     del filtered_msg["tool_calls"]
    #                 validated_messages.append(filtered_msg)

    #         elif msg.get("role") == "tool":
    #             tool_id = msg.get("tool_call_id")

    #             # Skip tool responses for auto-generated tool calls
    #             if tool_id and tool_id.startswith("auto_"):
    #                 print(
    #                     f"🔍     Skipping auto-generated tool response for tool_id: {tool_id}"
    #                 )
    #                 continue

    #             tool_responses_found += 1
    #             print(f"🔍     Tool response for tool_id: {tool_id}")

    #             # Match tool results to tool calls
    #             if tool_id in pending_tool_calls:
    #                 tool_call = pending_tool_calls[tool_id]
    #                 tool_name = tool_call.get("function", {}).get("name", "unknown")
    #                 print(f"🔍       ✅ Matched to tool: {tool_name}")
    #                 del pending_tool_calls[tool_id]
    #             else:
    #                 print(f"🔍       ❌ No matching tool call found for this response")

    #             validated_messages.append(msg)
    #         else:
    #             validated_messages.append(msg)

    #     print(
    #         f"🔍 Summary: {tool_calls_found} tool calls, {tool_responses_found} tool responses"
    #     )

    #     # Smart handling of unmatched tool calls
    #     if pending_tool_calls:
    #         print(f"🔍 ❌ Found {len(pending_tool_calls)} UNMATCHED tool calls:")

    #         # Check if this is a follow-up message after successful tool execution
    #         # Look for recent successful tool execution patterns
    #         recent_tool_responses = [
    #             msg for msg in messages[-10:] if msg.get("role") == "tool"
    #         ]
    #         has_recent_successful_tools = len(recent_tool_responses) > 0

    #         # Check if the last user message is just a thank you or acknowledgment
    #         last_user_msg = None
    #         for msg in reversed(messages):
    #             if msg.get("role") == "user":
    #                 last_user_msg = msg.get("content", "").lower()
    #                 break

    #         is_followup_acknowledgment = last_user_msg and any(
    #             phrase in last_user_msg
    #             for phrase in [
    #                 "thank",
    #                 "thanks",
    #                 "great",
    #                 "perfect",
    #                 "awesome",
    #                 "excellent",
    #                 "good job",
    #                 "well done",
    #             ]
    #         )

    #         if has_recent_successful_tools and is_followup_acknowledgment:
    #             print(
    #                 f"🔍 🎯 DETECTED: Follow-up message after successful tool execution"
    #             )
    #             print(f"🔍 🎯 Recent tool responses: {len(recent_tool_responses)}")
    #             print(f"🔍 🎯 Last user message: '{last_user_msg}'")
    #             print(
    #                 f"🔍 🎯 SKIPPING dummy responses - letting conversation flow naturally"
    #             )
    #             # Don't add dummy responses for follow-up acknowledgments
    #         else:
    #             print(
    #                 f"🔍 🔧 Adding dummy responses for genuinely unmatched tool calls"
    #             )
    #             for tool_id, tool_call in pending_tool_calls.items():
    #                 tool_name = tool_call.get("function", {}).get("name", "unknown")
    #                 print(f"🔍   - {tool_name} (id: {tool_id}) - ADDING DUMMY RESPONSE")
    #                 validated_messages.append(
    #                     {
    #                         "role": "tool",
    #                         "tool_call_id": tool_id,
    #                         "content": f"Tool execution was interrupted: {tool_name}",
    #                     }
    #                 )
    #     else:
    #         print(f"🔍 ✅ All tool calls have matching responses")

    #     print(f"🔍 === TOOL CALL VALIDATION END ===\n")
    #     return validated_messages

    # # INSTEAD OF GENERATE DEFAULT ARGS CHANGE THIS TO A LLM
    def _generate_default_args_for_tool(
        self, tool_name: str, user_message: str, context_info: dict = None
    ) -> str:
        """Generate default arguments for missing tools based on user message"""
        print(f"🟡 Generating default args for {tool_name}")
        print(f"🟡 Context info available: {context_info is not None}")
        if context_info:
            summary_data = context_info.get("summary_data", {})
            print(f"🟡 Summary data keys: {list(summary_data.keys())}")
            print(
                f"🟡 Contact IDs available: {len(summary_data.get('contact_ids', []))}"
            )
            print(
                f"🟡 Cadence info: cadence_id={summary_data.get('cadence_id')}, cadence_name={summary_data.get('cadence_name')}"
            )

        if tool_name == "create_cadence":
            # Extract campaign-related info from user message
            campaign_name = "Auto Campaign"
            if "BFSI" in user_message or "banking" in user_message.lower():
                campaign_name = "BFSI Outreach Campaign"
            elif "tech" in user_message.lower():
                campaign_name = "Technology Outreach Campaign"

            args = {
                "name": campaign_name,
                "cadence_type": "constant",
                "white_days": ["Mo", "Tu", "We", "Th", "Fr"],
                "is_active": False,
            }

        elif tool_name == "add_contacts_to_cadence":
            args = {
                "cadence_id": "auto_filled_by_system",
                "name": "auto_filled_by_system",
                "recipients_ids": [],
            }

            # Try to populate contact IDs from context if available
            if context_info:
                summary_data = context_info.get("summary_data", {})
                if summary_data.get("contact_ids"):
                    contact_ids = list(summary_data["contact_ids"])
                    args["recipients_ids"] = contact_ids  # Limit to 50
                    print(
                        f"🟡 Enhanced default args with {len(contact_ids)} contact IDs from context"
                    )

                # Try to get cadence info from context if available
                if summary_data.get("cadence_id"):
                    args["cadence_id"] = summary_data["cadence_id"]
                    print(f"🟡 Enhanced default args with cadence ID from context")
                if summary_data.get("cadence_name"):
                    args["name"] = summary_data["cadence_name"]
                    print(f"🟡 Enhanced default args with cadence name from context")

        elif tool_name == "generate_email":
            args = {
                "tone": "professional",
                "email_type": "outreach",
                "purpose": "introduce services",
            }

        elif tool_name == "search_companies":
            # Only populate company names from context, no other filters
            args = {"companyName": []}

            # When user says "find their companies", use contact company names from context
            if context_info:
                summary_data = context_info.get("summary_data", {})
                if summary_data.get("contact_company_names"):
                    company_names = list(summary_data["contact_company_names"])
                    args["companyName"] = company_names  # Limit to 50
                    print(
                        f"🟡 Enhanced search_companies with {len(company_names)} company names from context"
                    )

        elif tool_name == "search_leads":
            # Only populate company names/IDs from context, no other filters
            args = {}

            # Use company data from context if available
            if context_info:
                summary_data = context_info.get("summary_data", {})
                # Priority 1: Use company IDs if available
                if summary_data.get("company_ids"):
                    company_ids = list(summary_data["company_ids"])
                    args["companyIds"] = company_ids
                    print(
                        f"🟡 Enhanced search_leads with {len(company_ids)} company IDs from context"
                    )
                # Priority 2: Use company names if no IDs but names available
                elif summary_data.get("company_names"):
                    company_names = list(summary_data["company_names"])
                    args["companyName"] = company_names
                    print(
                        f"🟡 Enhanced search_leads with {len(company_names)} company names from context"
                    )
        else:
            # Generic fallback
            args = {}

        print(f"🟡 Generated args for {tool_name}: {args}")
        return json.dumps(args)

    def _map_parameters_from_context(
        self, tool_name: str, args: dict, context_info: dict
    ) -> dict:
        """
        Dedicated function to map parameters from context to tool arguments.
        This ensures systematic parameter extraction with proper validation.
        """
        context_string = context_info.get("context_string", "")
        summary_data = context_info.get("summary_data", {})

        print(f"🗂️ Mapping parameters for {tool_name} from context")
        print(f"🗂️ Available context data: {list(summary_data.keys())}")

        # Create a copy to avoid modifying original
        mapped_args = args.copy()

        if tool_name == "add_contacts_to_cadence":
            # Map contact IDs to recipients_ids
            if "contact_ids" in summary_data and summary_data["contact_ids"]:
                contact_ids = list(summary_data["contact_ids"])
                mapped_args["recipients_ids"] = contact_ids
                print(f"🗂️ Mapped {len(contact_ids)} contact IDs to recipients_ids")

            # Map cadence info from previous create_cadence
            if "cadence_id" in summary_data:
                mapped_args["cadence_id"] = summary_data["cadence_id"]
                print(f"🗂️ Mapped cadence_id: {summary_data['cadence_id']}")

            if "cadence_name" in summary_data:
                mapped_args["name"] = summary_data["cadence_name"]
                print(f"🗂️ Mapped cadence name: {summary_data['cadence_name']}")

        elif tool_name == "create_cadence":
            # Map email content to template_details
            if "email_content" in summary_data:
                email_data = summary_data["email_content"]
                if (
                    isinstance(email_data, dict)
                    and "body" in email_data
                    and "subject" in email_data
                ):
                    mapped_args["template_details"] = {
                        "body": email_data["body"],
                        "subject": email_data["subject"],
                    }
                    print(f"🗂️ Mapped email content to template_details")

        elif tool_name == "search_companies":
            # Map company names from contact results - especially when user says "search their companies" or "find companies of these contacts"
            if (
                "contact_company_names" in summary_data
                and summary_data["contact_company_names"]
            ):
                company_names = list(summary_data["contact_company_names"])
                # If companyName is empty or not specified, use contact company names
                if (
                    not mapped_args.get("companyName")
                    or mapped_args.get("companyName") == []
                ):
                    mapped_args["companyName"] = company_names  # Limit to 50
                    print(
                        f"🗂️ Mapped {len(company_names)} company names from contacts: {company_names[:10]}..."
                    )

                    # When using contact company names, clear other filters to focus on specific companies
                    if len(company_names) > 0:
                        mapped_args["industry"] = []  # Clear industry filter
                        mapped_args["hqCity"] = []  # Clear city filter
                        print(
                            f"🗂️ Cleared industry/city filters to focus on specific companies"
                        )
                else:
                    print(
                        f"🗂️ CompanyName already specified, not overriding with contact companies"
                    )
            else:
                print(f"🗂️ No contact company names available in context for mapping")

        elif tool_name == "search_leads":
            # Map company data from previous company search results
            # Case 1: Use company IDs if available
            if "company_ids" in summary_data and summary_data["company_ids"]:
                company_ids = list(summary_data["company_ids"])
                if (
                    not mapped_args.get("companyIds")
                    or mapped_args.get("companyIds") == []
                ):
                    mapped_args["companyIds"] = company_ids  # Limit to 50
                    print(f"🗂️ Mapped {len(company_ids)} company IDs for contact search")

            # Case 2: Use company names if no IDs but names available
            elif "company_names" in summary_data and summary_data["company_names"]:
                company_names = list(summary_data["company_names"])
                if (
                    not mapped_args.get("companyName")
                    or mapped_args.get("companyName") == []
                ):
                    mapped_args["companyName"] = company_names  # Limit to 50
                    print(
                        f"🗂️ Mapped {len(company_names)} company names for contact search: {company_names[:10]}..."
                    )

            # Case 3: Use company names from contact results (for finding more contacts at same companies)
            elif (
                "contact_company_names" in summary_data
                and summary_data["contact_company_names"]
            ):
                company_names = list(summary_data["contact_company_names"])
                if (
                    not mapped_args.get("companyName")
                    or mapped_args.get("companyName") == []
                ):
                    mapped_args["companyName"] = company_names  # Limit to 50
                    print(
                        f"🗂️ Mapped {len(company_names)} company names from previous contacts for more contact search"
                    )

        print(f"🗂️ Final mapped args: {mapped_args}")
        return mapped_args

    async def _llm_validate_arguments(
        self,
        session_id: str,
        tool_name: str,
        args: dict,
        user_message: str,
        conversation_context: List[Dict] = None,
    ) -> dict:
        """Use LLM to validate and clean tool arguments with full conversation context"""
        print(f"\n🔧 === ARGUMENT VALIDATION START ===")
        print(f"🔧 Tool: {tool_name}")
        print(f"🔧 Original args: {args}")
        print(f"🔧 User message: {user_message}")
        print(
            f"🔧 Has conversation context: {len(conversation_context) if conversation_context else 0} messages"
        )

        # Get context from previous tool outputs
        context_info = self._build_context_from_history(session_id)
        context_string = context_info.get("context_string", "")
        summary_data = context_info.get("summary_data", {})

        # First, try systematic parameter mapping from context
        mapped_args = self._map_parameters_from_context(tool_name, args, context_info)
        print(f"🔧 Args after context mapping: {mapped_args}")

        # Build validation prompt
        system_prompt = """You are an expert at validating tool arguments for a sales workflow system. Your job is to check if the arguments make sense, remove noise, and ensure they align with the user's request.

## Available Tools and Their Purpose:
- **search_companies**: Find companies based on criteria (industry, location, size, etc.)
- **search_leads**: Find contacts/decision makers (seniority, job titles, location, etc.) 
- **generate_email**: Create email content (tone, purpose, type)
- **create_cadence**: Set up email campaign (name, schedule, settings)
- **add_contacts_to_cadence**: Add contacts to existing campaign (requires recipients_ids, cadence_id)

## Your Task:
1. Check if arguments are relevant to the tool's purpose
2. Remove any irrelevant, empty, or noisy arguments
3. Ensure arguments align with the user's request
4. Fix obvious format issues (e.g., single values that should be arrays)
5. **IMPORTANT**: Extract missing parameter values from the Previous Tool Results section below
6. For create_cadence: Use email content from generate_email results if available
7. For add_contacts_to_cadence: Extract contact IDs from search results and use as recipients_ids parameter
8. **Parameter mapping examples with specific scenarios**:
   - Contact IDs from search → recipients_ids for add_contacts_to_cadence  
   - Email content from generate_email → template_details for create_cadence
   - Company names from contacts → companyName for search_companies

## **CRITICAL: Context-Based Argument Extraction Examples**

### **Example 1: Searching companies using contact company names**
**Context**: Previous search_leads found contacts from various companies
**Current Tool**: search_companies with empty companyName
**Action**: Extract company names from contact results
```json
{
  "industry": ["Technology", "SaaS"],
  "hqCity": ["San Francisco"],
  "companyName": ["Salesforce", "Slack", "Airbnb", "Stripe"]
}
```

### **Example 2: Adding contacts to campaign**
**Context**: Previous search_leads found 50 contacts, previous create_cadence created campaign "Tech Outreach"
**Current Tool**: add_contacts_to_cadence with missing recipients_ids
**Action**: Extract contact IDs and cadence details
```json
{
  "name": "Tech Outreach",
  "cadence_id": "687dd12d6657b06c8d943464",
  "recipients_ids": ["3334974824094106189", "2426841217015742464", "2426840174471151616"]
}
```

### **Example 3: Creating campaign with existing email content**
**Context**: Previous generate_email created email with subject/body
**Current Tool**: create_cadence with missing template_details
**Action**: Extract email content for campaign
```json
{
  "name": "BFSI Outreach Campaign",
  "cadence_type": "constant",
  "is_active": false,
  "template_details": {
    "subject": "Introduction to [Company] – Transforming BFSI Operations",
    "body": "Dear [Name], I hope this message finds you well..."
  }
}
```

### **Example 4: User says "search their companies" after finding contacts**
**Context**: Previous search_leads found contacts from "TCS", "Infosys", "Wipro", etc.
**Current Tool**: search_companies with empty arguments
**Action**: Use contact company names to search for those specific companies
```json
{
  "companyName": ["TCS", "Infosys", "Wipro", "HCL Technologies"],
  "industry": [],
  "hqCity": []
}
```

### **Example 5: User says "find contacts in these companies" after finding companies**
**Context**: Previous search_companies found companies with IDs: ["comp123", "comp456", "comp789"]
**Current Tool**: search_leads with empty companyId
**Action**: Use company IDs to search for contacts within those companies
```json
{
  "seniority": ["Manager", "Director"],
  "functionalLevel": ["Sales", "Marketing"],
  "companyId": ["comp123", "comp456", "comp789"]
}
```

### **Example 6: User says "search contacts at these companies" with company names**
**Context**: Previous search_companies found companies: "Salesforce", "Microsoft", "Google"
**Current Tool**: search_leads with empty companyName
**Action**: Use company names to search for contacts within those companies
```json
{
  "seniority": ["Senior", "Lead"],
  "companyName": ["Salesforce", "Microsoft", "Google"],
  "functionalLevel": ["Engineering", "Product"]
}
```

### **Example 7: Reverse lookup - contacts to companies to more contacts**
**Context**: Found contacts at "Stripe" → Found Stripe company details → Now find more contacts at Stripe
**Current Tool**: search_leads requesting more contacts
**Action**: Use company ID/name from previous company search
```json
{
  "companyId": ["stripe_company_id_12345"],
  "seniority": ["VP", "C-Level"],
  "functionalLevel": ["Sales", "Business Development"]
}
```

## Response Format:
Return ONLY valid JSON with the cleaned arguments. No explanations."""

        # Build context from conversation
        context_summary = ""
        if conversation_context:
            context_messages = []
            for msg in conversation_context[-5:]:  # Last 5 messages for context
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role in ["user", "assistant"] and content:
                    context_messages.append(f"{role}: {content[:200]}")
            if context_messages:
                context_summary = f"\n## Conversation Context:\n" + "\n".join(
                    context_messages
                )

        # Add previous tool results context
        tool_results_context = ""
        if context_string:
            tool_results_context = f"\n## Previous Tool Results:\n{context_string}\n"
        if summary_data:
            tool_results_context += f"\n## Available Data for Use:\n"
            if "contact_ids" in summary_data:
                tool_results_context += f"- Contact IDs (use as recipients_ids): {summary_data['contact_ids']}\n"
            if "cadence_id" in summary_data:
                tool_results_context += f"- Cadence ID: {summary_data['cadence_id']}\n"
            if "email_content" in summary_data:
                tool_results_context += f"- Email Content Available: Yes\n"

        user_content = f"""## User Request:
"{user_message}"{context_summary}{tool_results_context}

## Tool Being Called:
{tool_name}

## Current Arguments:
{json.dumps(mapped_args, indent=2)}

## Task:
Validate these arguments. Remove any that are irrelevant, empty, or don't make sense for this tool and user request. Fix format issues. IMPORTANTLY: If you see relevant data in the Previous Tool Results section above, extract and use it to populate missing parameters. Return the cleaned arguments as JSON."""

        try:
            print(f"🔧 Making validation API call...")
            response = await self.openrouter_client.chat_completion_with_retries(
                session_id=session_id,
                purpose="validate_arguments",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                model_preference_list=[
                    "openai/gpt-4o-mini",
                    "mistralai/mistral-small-3.2-24b-instruct",
                    "openai/gpt-4o-mini",
                ],
                response_format=ResponseFormat.JSON,
                temperature=0.0,  # More deterministic for validation
                max_retries_per_model=1,
            )

            print(f"🔧 Validation API response received: {bool(response)}")
            if response:
                print(
                    f"🔧 Raw response keys: {list(response.keys()) if response else 'None'}"
                )
                content = self.openrouter_client.extract_content(response)
                print(f"🔧 Extracted content: '{content[:200]}...' (truncated)")
                if content and content.strip():
                    # Check if the response contains the "no tools" message
                    if (
                        "don't have access to" in content.lower()
                        or "currently don't have" in content.lower()
                    ):
                        print(f"🔧 ❌ LLM RESPONDED WITH 'NO TOOLS' MESSAGE!")
                        print(
                            f"🔧 This indicates tools are not being passed correctly to validation API"
                        )
                        print(f"🔧 Full content: {content}")
                        # Return mapped args since validation failed
                        print(f"🔧 === ARGUMENT VALIDATION END (FAILED) ===\n")
                        return mapped_args
                    try:
                        # Parse the JSON response
                        json_start = content.find("{")
                        json_end = content.rfind("}") + 1

                        if json_start != -1 and json_end > json_start:
                            json_string = content[json_start:json_end]
                            validated_args = json.loads(json_string)

                            # Safety check: ensure validated args are still a dict
                            if not isinstance(validated_args, dict):
                                print(f"🔧   LLM returned non-dict, using mapped")
                                return mapped_args

                            # Safety check: don't let LLM completely empty the args unless original was empty
                            if not validated_args and args:
                                print(
                                    f"🔧   LLM emptied all args, keeping at least one original"
                                )
                                # Keep the most important arg from original
                                if (
                                    tool_name == "search_companies"
                                    and "industry" in args
                                ):
                                    validated_args = {"industry": args["industry"]}
                                elif (
                                    tool_name == "search_leads" and "seniority" in args
                                ):
                                    validated_args = {"seniority": args["seniority"]}
                                elif tool_name == "create_cadence" and "name" in args:
                                    validated_args = {"name": args["name"]}
                                else:
                                    # Take first non-empty arg
                                    for key, value in args.items():
                                        if value:
                                            validated_args = {key: value}
                                            break

                            # Safety check: preserve critical arguments
                            critical_args = {
                                "create_cadence": ["name"],
                                "add_contacts_to_cadence": [
                                    "cadence_id",
                                    "contact_ids",
                                ],
                            }

                            if tool_name in critical_args:
                                for critical_arg in critical_args[tool_name]:
                                    if (
                                        critical_arg in args
                                        and critical_arg not in validated_args
                                    ):
                                        print(
                                            f"🔧   Preserving critical arg: {critical_arg}"
                                        )
                                        validated_args[critical_arg] = args[
                                            critical_arg
                                        ]

                            print(
                                f"🔧   LLM validation successful - preserved structure"
                            )
                            print(f"🔧 === ARGUMENT VALIDATION END (SUCCESS) ===\n")
                            return validated_args

                    except json.JSONDecodeError as e:
                        print(f"🔧   LLM validation JSON parse failed: {e}")
                else:
                    print(f"🔧   LLM validation returned empty content")
            else:
                print(f"🔧   LLM validation failed - no response")

        except Exception as e:
            print(f"🔧   LLM validation error: {e}")

        # Fallback to mapped arguments
        print(f"🔧   Falling back to mapped arguments")
        print(f"🔧 === ARGUMENT VALIDATION END (FALLBACK) ===\n")
        return mapped_args

    async def _batch_validate_arguments(
        self,
        session_id: str,
        preprocessed_tools: List[Dict],
        user_message: str,
        conversation_context: List[Dict] = None,
    ) -> List[Dict]:
        """Batch validate all tool arguments in a single LLM call for efficiency"""
        print(f"🔧 Batch validating {len(preprocessed_tools)} tools")

        if not preprocessed_tools:
            return []

        # If only one tool, use the original function
        if len(preprocessed_tools) == 1:
            tool = preprocessed_tools[0]
            llm_validated_args = await self._llm_validate_arguments(
                session_id,
                tool["tool_name"],
                tool["preprocessed_args"],
                user_message,
                conversation_context,
            )
            # Apply parameter corrections after LLM validation
            final_args = self._validate_and_filter_tool_args(
                tool["tool_name"], llm_validated_args
            )
            return [
                {
                    "tool_call": tool["tool_call"],
                    "tool_name": tool["tool_name"],
                    "final_args": final_args,
                }
            ]

        # Build batch validation prompt
        tools_summary = []
        for i, tool in enumerate(preprocessed_tools):
            tools_summary.append(
                f"""
Tool {i+1}: {tool['tool_name']}
Arguments: {json.dumps(tool['preprocessed_args'], indent=2)}"""
            )

        batch_prompt = f"""
You are validating tool arguments for multiple tools at once. Please review and clean each tool's arguments.

USER REQUEST: "{user_message}"

TOOLS TO VALIDATE:
{''.join(tools_summary)}

Return a JSON object with this exact structure:
{{
  "validated_tools": [
    {{
      "tool_index": 0,
      "tool_name": "tool_name_here", 
      "final_args": {{validated_arguments_here}}
    }},
    ...
  ]
}}

Rules:
- Keep only valid, relevant arguments for each tool
- Remove empty, null, or irrelevant parameters
- Ensure arguments match the user's intent
- Maintain the exact tool_index order (0, 1, 2, ...)
"""

        try:
            response = await self.openrouter_client.chat_completion_with_retries(
                session_id=session_id,
                purpose="batch_validate_arguments",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a tool argument validator. Return only valid JSON.",
                    },
                    {"role": "user", "content": batch_prompt},
                ],
                model_fallbacks=[
                    "mistralai/mistral-small-3.2-24b-instruct",
                    "anthropic/claude-3-haiku",
                ],
                response_format=ResponseFormat.JSON,
                temperature=0.1,
                max_retries=2,
            )

            if response and "choices" in response:
                content = response["choices"][0]["message"]["content"]
                if content and content.strip():
                    try:
                        # Remove markdown code blocks if present
                        clean_content = content.strip()
                        if clean_content.startswith("```json"):
                            clean_content = clean_content[7:]  # Remove ```json
                        if clean_content.startswith("```"):
                            clean_content = clean_content[3:]  # Remove ```
                        if clean_content.endswith("```"):
                            clean_content = clean_content[:-3]  # Remove ```
                        clean_content = clean_content.strip()

                        batch_result = json.loads(clean_content)
                    except json.JSONDecodeError as e:
                        print(f"🔧 ❌ Batch validation JSON parse error: {e}")
                        print(f"🔧 Raw content: {content[:500]}...")
                        raise e
                    validated_tools = []

                    for tool_data in batch_result.get("validated_tools", []):
                        tool_index = tool_data.get("tool_index", 0)
                        if 0 <= tool_index < len(preprocessed_tools):
                            llm_validated_args = tool_data.get(
                                "final_args",
                                preprocessed_tools[tool_index]["preprocessed_args"],
                            )
                            # Apply parameter corrections after LLM validation
                            final_args = self._validate_and_filter_tool_args(
                                preprocessed_tools[tool_index]["tool_name"],
                                llm_validated_args,
                            )
                            validated_tools.append(
                                {
                                    "tool_call": preprocessed_tools[tool_index][
                                        "tool_call"
                                    ],
                                    "tool_name": preprocessed_tools[tool_index][
                                        "tool_name"
                                    ],
                                    "final_args": final_args,
                                }
                            )

                    print(
                        f"🔧 ✅ Batch validation successful for {len(validated_tools)} tools"
                    )
                    return validated_tools

        except Exception as e:
            print(f"🔧 ❌ Batch validation failed: {e}")

        # Fallback: use individual validation for each tool
        print(f"🔧 Falling back to individual validation")
        validated_tools = []
        for tool in preprocessed_tools:
            llm_validated_args = await self._llm_validate_arguments(
                session_id,
                tool["tool_name"],
                tool["preprocessed_args"],
                user_message,
                conversation_context,
            )
            # Apply parameter corrections after LLM validation
            final_args = self._validate_and_filter_tool_args(
                tool["tool_name"], llm_validated_args
            )
            validated_tools.append(
                {
                    "tool_call": tool["tool_call"],
                    "tool_name": tool["tool_name"],
                    "final_args": final_args,
                }
            )

        return validated_tools

    def _check_argument_quality(
        self, tool_name: str, args: dict, user_message: str
    ) -> dict:
        """Check and clean argument quality to reduce noise from main agent"""
        print(f"🔧 Checking argument quality for {tool_name}")

        # Define expected arguments for each tool
        expected_args = {
            "search_companies": {
                "required": [],
                "optional": [
                    "industry",
                    "hqCity",
                    "hqState",
                    "hqCountry",
                    "size",
                    "revenue",
                    "fundingType",
                ],
                "arrays": [
                    "industry",
                    "hqCity",
                    "hqState",
                    "hqCountry",
                    "size",
                    "revenue",
                    "fundingType",
                ],
            },
            "search_leads": {
                "required": [],
                "optional": [
                    "seniority",
                    "functionalLevel",
                    "designation",
                    "industry",
                    "city",
                    "state",
                    "country",
                    "companyIds",
                ],
                "arrays": [
                    "seniority",
                    "functionalLevel",
                    "designation",
                    "industry",
                    "city",
                    "state",
                    "country",
                    "companyIds",
                ],
            },
            "generate_email": {
                "required": [],
                "optional": [
                    "tone",
                    "email_type",
                    "purpose",
                    "company_name",
                    "recipient_name",
                ],
                "arrays": [],
            },
            "create_cadence": {
                "required": ["name"],
                "optional": ["cadence_type", "white_days", "is_active", "tags"],
                "arrays": ["white_days", "tags"],
            },
            "add_contacts_to_cadence": {
                "required": ["cadence_id", "contact_ids"],
                "optional": [],
                "arrays": ["contact_ids"],
            },
        }

        if tool_name not in expected_args:
            print(f"🔧   ⚠️ Unknown tool {tool_name}, skipping validation")
            return args

        tool_spec = expected_args[tool_name]
        cleaned_args = {}
        issues_found = []

        # Check each argument
        for key, value in args.items():
            if key not in tool_spec["required"] + tool_spec["optional"]:
                issues_found.append(f"Unexpected argument: {key}")
                continue

            # Validate array fields
            if key in tool_spec["arrays"]:
                if not isinstance(value, list):
                    if value:  # Convert non-empty values to arrays
                        cleaned_args[key] = [value] if value else []
                        issues_found.append(
                            f"Converted {key} from {type(value).__name__} to array"
                        )
                    else:
                        cleaned_args[key] = []
                else:
                    # Clean empty/invalid array items
                    cleaned_value = [
                        item for item in value if item and str(item).strip()
                    ]
                    cleaned_args[key] = cleaned_value
                    if len(cleaned_value) != len(value):
                        issues_found.append(f"Removed empty items from {key}")
            else:
                # Non-array fields
                if value and str(value).strip():
                    cleaned_args[key] = value
                else:
                    issues_found.append(f"Removed empty value for {key}")

        # Check for missing required arguments
        missing_required = [
            arg for arg in tool_spec["required"] if arg not in cleaned_args
        ]
        if missing_required:
            for arg in missing_required:
                issues_found.append(f"Missing required argument: {arg}")
                # Try to generate default for required args
                if tool_name == "create_cadence" and arg == "name":
                    cleaned_args[arg] = "Generated Campaign"

        # Contextual validation based on user message
        context_issues = self._validate_arguments_against_context(
            tool_name, cleaned_args, user_message
        )
        issues_found.extend(context_issues)

        if issues_found:
            print(f"🔧   ⚠️ Issues found: {issues_found}")
        else:
            print(f"🔧   ✅ Arguments look good")

        return cleaned_args

    def _check_and_skip_empty_searches(
        self, current_step, result, execution_plan, completed_steps
    ):
        """
        Check if a search tool returned empty results and mark related searches for skipping
        to avoid unnecessary API calls.
        """
        if not execution_plan or not execution_plan.steps:
            return

        # Check if current step is a search tool that returned empty results
        if current_step.tool_name == "search_leads":
            # Check if contacts were found
            contacts = result.get("contacts", []) if isinstance(result, dict) else []
            if not contacts:
                print(
                    f"🚫 No contacts found in {current_step.step_id}, marking search_companies steps for skipping"
                )
                # Mark any search_companies steps for skipping
                for step in execution_plan.steps:
                    if (
                        step.tool_name == "search_companies"
                        and step.step_id not in completed_steps
                        and not step.depends_on
                    ):  # Only skip independent company searches
                        step.skip_reason = "No contacts found to warrant company search"
                        print(
                            f"  - Marking {step.get('step_id')} (search_companies) for skipping"
                        )

        elif current_step.tool_name == "search_companies":
            # Check if companies were found
            companies = result.get("companies", []) if isinstance(result, dict) else []
            if not companies:
                print(
                    f"🚫 No companies found in {current_step.step_id}, marking search_leads steps for skipping"
                )
                # Mark any search_leads steps for skipping
                for step in execution_plan.steps:
                    if (
                        step.tool_name == "search_leads"
                        and step.step_id not in completed_steps
                        and not step.depends_on
                    ):  # Only skip independent lead searches
                        step.skip_reason = "No companies found to warrant lead search"
                        print(
                            f"  - Marking {step.get('step_id')} (search_leads) for skipping"
                        )

    def _validate_arguments_against_context(
        self, tool_name: str, args: dict, user_message: str
    ) -> list:
        """Validate arguments against user context to catch obvious errors"""
        issues = []

        # Check for obvious mismatches
        if tool_name in ["search_companies", "search_leads"]:
            # Check if location in args matches user message
            user_lower = user_message.lower()

            # Check city mismatch
            if "city" in args and args["city"]:
                arg_cities = [city.lower() for city in args["city"]]
                if "pune" in user_lower and not any(
                    "pune" in city for city in arg_cities
                ):
                    issues.append(
                        "City mismatch: user mentioned Pune but args don't include it"
                    )
                elif "bangalore" in user_lower and not any(
                    "bangalore" in city or "bengaluru" in city for city in arg_cities
                ):
                    issues.append(
                        "City mismatch: user mentioned Bangalore but args don't include it"
                    )

            # Check industry mismatch
            if "industry" in args and args["industry"]:
                arg_industries = [ind.lower() for ind in args["industry"]]
                if "BFSI" in user_message and not any(
                    "banking" in ind or "financial" in ind or "insurance" in ind
                    for ind in arg_industries
                ):
                    issues.append(
                        "Industry mismatch: user mentioned BFSI but args don't include financial services"
                    )
                elif "tech" in user_lower and not any(
                    "tech" in ind or "software" in ind for ind in arg_industries
                ):
                    issues.append(
                        "Industry mismatch: user mentioned tech but args don't include technology"
                    )

        return issues

    def _handle_title_update(self, session_id: str, messages: List[str]):
        """
        Calls the TitleGenerator and saves the new title to session memory and storage.
        This method is designed to be run in a background thread.
        """
        try:
            print(f"🔥 Starting background title generation for session '{session_id}'")
            # Generate the title using the LLM (need to run async in thread)
            new_title = asyncio.run(
                self.title_generator.generate_title(session_id, messages)
            )

            # Update the title in the session memory
            if session_id in self.memory:
                self.memory[session_id]["title"] = new_title
                print(f"🎨 Title for session '{session_id}' updated to: '{new_title}'")
                # Persist the change immediately
                self._save_session_to_storage(session_id)
            else:
                print(f"❌ Session {session_id} not found in memory")

        except Exception as e:
            print(f"❌ Error in title generation: {e}")
            import traceback

            traceback.print_exc()

    """
    Storage related functions 
    """

    def clear_session(self, session_id: str):
        """Clear all data for a session"""
        if session_id in self.memory:
            del self.memory[session_id] 
        if self.mongo_client:
            self.mongo_client.delete_session(session_id)

    def list_all_sessions(self) -> List[str]:
        """Get list of all available sessions"""
        if self.mongo_client:
            # Use the new, more detailed MongoClient method
            return self.mongo_client.list_sessions_with_details(self.user_id)
        else:
            # Fallback for in-memory storage to match the data structure
            return [
                {"session_id": sid, "title": self.memory[sid].get("title", "New Chat")}
                for sid in self.memory.keys()
            ]

    def get_full_conversation(self, session_id: str) -> Dict:
        """Return conversation without tool messages and with assistant messages enriched with tool outputs"""
        return self.mongo_client.load_conversation_with_tool_outputs(
            self.user_id, session_id
        )
