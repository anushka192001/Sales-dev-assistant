import json
from typing import List, Dict
from LLM.open_router_client import OpenRouterClient, ResponseFormat


class ExecutionTypeAnalyzer:
    """
    Comprehensive analyzer that determines execution type and dependencies
    """

    def __init__(self, openrouter_client: OpenRouterClient):
        self.client = openrouter_client

    async def determine_execution_type(
        self,
        session_id: str,
        user_message: str,
        tool_calls: List[Dict],
        context_info: Dict = None,
    ) -> Dict:
        """
        Determines execution type and dependencies based on user intent and tool relationships
        """
        if len(tool_calls) <= 1:
            return {
                "execution_type": "parallel",
                "reasoning": "Single tool call requires no dependency analysis",
                "confidence": 1.0,
                "dependencies": {},
            }

        # Use LLM to analyze dependencies (focus on the tools that were actually called)
        return await self._analyze_dependencies(
            session_id, user_message, tool_calls, context_info
        )

    async def _analyze_dependencies(
        self,
        session_id: str,
        user_message: str,
        tool_calls: List[Dict],
        context_info: Dict = None,
    ) -> Dict:
        """Uses LLM to analyze tool dependencies"""
        analysis_prompt = self._build_dependency_analysis_prompt(
            user_message, tool_calls, context_info
        )
        response = await self.client.chat_completion_with_retries(
            session_id=session_id,
            purpose="analyze_dependencies",
            messages=analysis_prompt,
            model_fallbacks=[
                "openai/gpt-4o-mini",
                "qwen/qwen3-235b-a22b",
                "openai/gpt-4o-mini",
            ],
            response_format=ResponseFormat.JSON,
            temperature=0.1,
            prefer_provider="DeepInfra",
            max_retries_per_model=1,
        )

        if response:
            try:
                content = self.client.extract_content(response)
                # Handle potential non-JSON wrapped responses
                json_start = content.find("{")
                json_end = content.rfind("}") + 1

                if json_start != -1 and json_end > json_start:
                    json_string = content[json_start:json_end]
                    result = json.loads(json_string)

                    # Validate for circular dependencies
                    if "dependencies" in result:
                        result = self._fix_circular_dependencies(result, tool_calls)

                    return result

            except json.JSONDecodeError as e:
                # Silent fallback to default execution
                pass

        # Fallback - use sequential as safe default
        return {
            "execution_type": "sequential",
            "reasoning": "Could not determine dependencies automatically.",
            "confidence": 0.0,
            "dependencies": {},
        }

    async def _check_missing_tools(
        self,
        session_id: str,
        user_message: str,
        tool_calls: List[Dict],
        context_info: Dict = None,
    ) -> Dict:
        """
        Checks if the LLM missed any tools that the user requested
        """
        current_tools = [call["function"]["name"] for call in tool_calls]

        system_message = (
            "You are an expert at analyzing user requests for sales workflows. Your job is to determine if the LLM missed any required tools.\n\n"
            "## Available Tools:\n"
            "- **search_companies**: Find companies based on criteria\n"
            "- **search_leads**: Find contacts/decision makers\n"
            "- **generate_email**: Create email content\n"
            "- **create_cadence**: Set up email campaign\n"
            "- **add_contacts_to_cadence**: Add contacts to existing campaign\n\n"
            "## Common User Request Patterns & Required Tools:\n\n"
            "### Simple Searches:\n"
            "1. 'Find tech companies in SF' → **search_companies**\n"
            "2. 'Find CEOs at startups' → **search_leads**\n"
            "3. 'Search for decision makers' → **search_leads**\n\n"
            "### Email Creation:\n"
            "4. 'Write an email to CEOs' → **generate_email**\n"
            "5. 'Create outreach email' → **generate_email**\n"
            "6. 'Draft a cold email' → **generate_email**\n"
            "7. 'Generate email content' → **generate_email**\n\n"
            "### Campaign/Cadence Workflows:\n"
            "8. 'Create a campaign' → **create_cadence** + **generate_email**\n"
            "9. 'Launch outreach campaign' → **create_cadence** + **generate_email** + **add_contacts_to_cadence**\n"
            "10. 'Start email sequence' → **create_cadence** + **generate_email**\n"
            "11. 'Set up automated outreach' → **create_cadence** + **generate_email**\n\n"
            "### Complete Workflows:\n"
            "12. 'Find companies and email them' → **search_companies** + **generate_email**\n"
            "13. 'Find CEOs and create campaign' → **search_leads** + **generate_email** + **create_cadence** + **add_contacts_to_cadence**\n"
            "14. 'Search fintech companies, find contacts, and start outreach' → **search_companies** + **search_leads** + **generate_email** + **create_cadence** + **add_contacts_to_cadence**\n\n"
            "### Campaign Management:\n"
            "15. 'Add contacts to existing campaign' → **add_contacts_to_cadence**\n"
            "16. 'Add these leads to outreach' → **add_contacts_to_cadence**\n"
            "17. 'Use these contacts for campaign' → **create_cadence** + **add_contacts_to_cadence** (NO search tools)\n"
            "18. 'Create campaign with these contacts' → **create_cadence** + **add_contacts_to_cadence** (NO search tools)\n"
            "19. 'Use email and contacts for campaign' → **create_cadence** + **add_contacts_to_cadence** (NO search or email tools)\n"
            "20. 'Create a campaign with these people' → **create_cadence** + **add_contacts_to_cadence** (uses existing search results)\n"
            "21. 'Launch outreach to search results' → **create_cadence** + **add_contacts_to_cadence** (uses existing search results)\n"
            "22. 'Start campaign with found contacts' → **create_cadence** + **add_contacts_to_cadence** (uses existing search results)\n"
            "23. 'Set up outreach for these leads' → **create_cadence** + **add_contacts_to_cadence** (uses existing search results)\n"
            "24. 'Create cadence with these contacts' → **create_cadence** + **add_contacts_to_cadence** (uses existing search results)\n\n"
            "25. 'Create cadence with search  results' → **create_cadence** + **add_contacts_to_cadence** (uses existing search results)\n\n"
            "## Key Detection Rules:\n"
            "- **Email keywords**: 'email', 'write', 'draft', 'generate', 'create content', 'outreach message' → needs **generate_email**\n"
            "- **Campaign keywords**: 'campaign', 'cadence', 'sequence', 'launch', 'start', 'automated', 'outreach' → needs **create_cadence**\n"
            "- **Adding contacts**: 'add to', 'include in', 'put in campaign', 'with these people', 'with search results', 'use found contacts' → needs **add_contacts_to_cadence**\n"
            "- **Campaign + Search Results**: When user wants to create campaign AND contacts exist in search results → needs **create_cadence** + **add_contacts_to_cadence**\n"
            "- **Complete workflow**: Any mention of full process needs ALL relevant tools\n\n"
            "## CRITICAL: When NOT to Add Campaign Tools\n"
            "- **'Find their companies'** → ONLY search_companies (NO campaign tools)\n"
            "- **'Search for companies'** → ONLY search_companies (NO campaign tools)\n"
            "- **'Get company information'** → ONLY search_companies (NO campaign tools)\n"
            "- **'Find contacts'** → ONLY search_leads (NO campaign tools)\n"
            "- **'Research companies'** → ONLY search_companies (NO campaign tools)\n"
            "- **User asks for SEARCH only** → Do NOT add campaign/email tools unless explicitly requested\n\n"
            "## Response Format:\n"
            "Return JSON with:\n"
            "- `has_missing_tools`: boolean\n"
            "- `reasoning`: explanation of analysis\n"
            "- `missing_tools`: array of tool names that should have been called\n"
            "- `suggested_tools`: array of tool names in execution order\n\n"
            "**IMPORTANT RULES**:\n"
            "1. If user mentions creating campaigns, launching outreach, or email sequences, they need create_cadence + add_contacts_to_cadence\n"
            "2. Only add generate_email if no email content exists in Previous Tool Results\n"
            "3. **CRITICAL**: If contacts are already found in Previous Tool Results, DO NOT add search_companies\n"
            "4. **CRITICAL**: If user says 'use these contacts' or 'with these contacts', they want to use EXISTING contacts, not find new ones, map\n"
            "5. **CRITICAL**: Only add search tools if user explicitly asks to 'find more', 'search for', or 'get additional' contacts/companies"
        )

        # Add context from previous tool results
        context_section = ""
        if context_info:
            context_string = context_info.get("context_string", "")
            summary_data = context_info.get("summary_data", {})
            if context_string:
                context_section += f"\n## Previous Tool Results:\n{context_string}\n"
            if summary_data.get("email_content"):
                context_section += f"\n## Available Email Content: Yes (from previous generate_email)\n"
            if summary_data.get("contact_ids"):
                context_section += f"\n## Available Contact IDs: {len(summary_data['contact_ids'])} contacts found\n"

        user_content = (
            f"## User Request:\n"
            f'"{user_message}"{context_section}\n\n'
            f"## Tools Actually Called:\n"
            f"{current_tools}\n\n"
            f"Analyze if any tools are missing based on what the user requested. **CRITICAL CHECKS**:\n"
            f"- If email content exists in Previous Tool Results → do NOT add generate_email\n"
            f"- If contacts exist in Previous Tool Results → do NOT add search_companies or search_leads\n"
            f"- If user says 'use these contacts' or 'with these contacts' → do NOT add search tools\n"
            f"- **CRITICAL**: If user ONLY asks for search (like 'find their companies') → do NOT add campaign tools\n"
            f"- **CRITICAL**: Campaign tools should ONLY be added if user explicitly mentions 'campaign', 'cadence', 'outreach', 'sequence'\n"
            f"- Only add search tools if user explicitly requests finding NEW or ADDITIONAL contacts/companies:"
        )

        try:
            response = await self.client.chat_completion_with_retries(
                session_id=session_id,
                purpose="check_missing_tools",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_content},
                ],
                model_fallbacks=[
                    "anthropic/claude-3.5-sonnet",
                    "qwen/qwen3-235b-a22b",
                    "openai/gpt-4o",
                    "openai/gpt-4o-mini",
                ],
                response_format=ResponseFormat.JSON,
                temperature=0.1,
                max_retries_per_model=1,
            )

            if response:
                try:
                    content = self.client.extract_content(response)
                    json_start = content.find("{")
                    json_end = content.rfind("}") + 1

                    if json_start != -1 and json_end > json_start:
                        json_string = content[json_start:json_end]
                        result = json.loads(json_string)
                        return result

                except json.JSONDecodeError:
                    pass

        except Exception:
            pass
        return {
            "has_missing_tools": False,
            "reasoning": "Could not determine missing tools",
            "missing_tools": [],
            "suggested_tools": current_tools,
        }

    def _fix_circular_dependencies(self, result: dict, tool_calls: List[Dict]) -> dict:
        """Detect and fix circular dependencies in execution plan"""
        dependencies = result.get("dependencies", {})

        if not dependencies:
            return result

        print(f"🔄 Checking for circular dependencies...")

        # Get tool names by step
        tool_names = {}
        for i, tool_call in enumerate(tool_calls):
            step_id = f"step_{i}"
            tool_name = tool_call.get("function", {}).get("name", "unknown")
            tool_names[step_id] = tool_name

        # Check for circular dependencies
        has_circular = False
        for step_id, deps in dependencies.items():
            for dep_step in deps:
                if dep_step in dependencies and step_id in dependencies[dep_step]:
                    print(f"🔄 ❌ Circular dependency detected: {step_id} ↔ {dep_step}")
                    print(
                        f"🔄    Tools: {tool_names.get(step_id, 'unknown')} ↔ {tool_names.get(dep_step, 'unknown')}"
                    )
                    has_circular = True

        if has_circular:
            print(f"🔄 🛠️ Fixing circular dependencies...")
            fixed_dependencies = {}

            # Apply correct dependency rules
            for step_id, tool_name in tool_names.items():
                if tool_name == "add_contacts_to_cadence":
                    # add_contacts_to_cadence should only depend on create_cadence if it exists
                    create_cadence_step = None
                    for s_id, t_name in tool_names.items():
                        if t_name == "create_cadence":
                            create_cadence_step = s_id
                            break

                    if create_cadence_step:
                        fixed_dependencies[step_id] = [create_cadence_step]
                        print(
                            f"🔄    Fixed: {tool_name} now depends only on create_cadence"
                        )

                elif tool_name == "create_cadence":
                    # create_cadence should never depend on add_contacts_to_cadence
                    # Only depend on search/email tools in current batch
                    valid_deps = []
                    for s_id, t_name in tool_names.items():
                        if t_name in [
                            "search_leads",
                            "search_companies",
                            "generate_email",
                        ]:
                            valid_deps.append(s_id)

                    if valid_deps:
                        fixed_dependencies[step_id] = valid_deps
                        print(
                            f"🔄    Fixed: {tool_name} depends only on search/email tools"
                        )
                    # If no valid deps, create_cadence is independent

            result["dependencies"] = fixed_dependencies
            result["reasoning"] = (
                "Fixed circular dependencies. add_contacts_to_cadence depends on create_cadence only."
            )
            print(f"🔄 ✅ Circular dependencies fixed!")

        return result

    def _build_dependency_analysis_prompt(
        self, user_message: str, tool_calls: List[Dict], context_info: Dict = None
    ) -> List[Dict]:
        """Builds comprehensive dependency analysis prompt"""

        # Add context information about what's already been done
        context_section = ""
        if context_info:
            context_string = context_info.get("context_string", "")
            summary_data = context_info.get("summary_data", {})

            if context_string or summary_data:
                context_section += "\n## CRITICAL: Previous Tool Results Available\n"
                if summary_data.get("contact_ids"):
                    context_section += f"- ✅ **CONTACTS ALREADY FOUND**: {len(summary_data['contact_ids'])} contacts available\n"
                if summary_data.get("company_ids") or summary_data.get("company_names"):
                    context_section += (
                        f"- ✅ **COMPANIES ALREADY FOUND**: Company data available\n"
                    )
                if summary_data.get("email_content"):
                    context_section += (
                        f"- ✅ **EMAIL ALREADY GENERATED**: Email content available\n"
                    )
                if summary_data.get("cadence_id"):
                    context_section += f"- ✅ **CADENCE ALREADY EXISTS**: Cadence ID {summary_data['cadence_id']}\n"

                context_section += "\n**IMPORTANT**: Only create dependencies between tools in the CURRENT execution batch. Do NOT depend on tools that were already completed in previous conversations.\n\n"

        system_message = (
            "You are an expert at analyzing sales workflow dependencies. Your job is to determine which tools depend on outputs from other tools.\n\n"
            f"{context_section}"
            "## Tool Dependency Rules:\n"
            "1. **search_leads** can depend on **search_companies** (when finding contacts from specific companies)\n"
            "2. **search_companies** can depend on **search_leads** (when finding companies for specific contacts)\n"
            "3. **generate_email** is ALWAYS independent (never depends on search results)\n"
            "4. **create_cadence** dependency rules:\n"
            "   - **ALWAYS depends on generate_email** if generate_email is in current batch (needs email template)\n"
            "   - Can depend on **search_leads** (for recipients/contacts) - ONLY if search_leads is in current tools\n"
            "   - Can depend on **search_companies** (for recipients via contacts) - ONLY if search_companies is in current tools\n"
            "   - **IMPORTANT**: If email template already exists from previous conversations, create_cadence should NOT depend on generate_email\n"  
            "5. **add_contacts_to_cadence** dependency rules:\n"
            "   - **ALWAYS depends on create_cadence** if create_cadence is in current batch\n"
            "   - **NEVER depends on search tools** (create_cadence will handle that dependency)\n"
            "   - **Can be independent** ONLY if cadence already exists from previous conversations AND create_cadence is NOT in current batch\n"
            "## CRITICAL Dependency Rules:\n"
            "- **generate_email + create_cadence together**: create_cadence MUST depend on generate_email\n"
            "- The email content from generate_email becomes template_details in create_cadence\n"
            "- This is a MANDATORY sequential dependency when both tools are called together\n"
            "6. **CRITICAL: NO CIRCULAR DEPENDENCIES**:\n"
            "   - create_cadence can depend on search/email tools\n"
            "   - add_contacts_to_cadence can depend on create_cadence\n"
            "   - **NEVER**: create_cadence depending on add_contacts_to_cadence\n"
            "   - **NEVER**: Both tools depending on each other"
            "## Dependency Detection, Very important:\n"
            "Look for these patterns in user messages:\n"
            "- 'find contacts and **their** companies' → search_companies depends on search_leads\n"
            "- 'find companies and **get contacts**' → search_leads depends on search_companies\n"
            "- 'create campaign for **those contacts**' → create_cadence depends on search_leads\n"
            "- 'generate email and **create campaign**' → create_cadence depends on generate_email\n"
            "- 'write email and create campaign **with it**' → create_cadence depends on generate_email\n"
            "- 'generate email and set up campaign **with it**' → create_cadence depends on generate_email\n"
            "- 'create email template and **use it** for campaign' → create_cadence depends on generate_email\n"
            "- 'find contacts, generate email, **create campaign**' → create_cadence depends on both\n\n"
            "-' create a cadence with **ajay dubey**'  → create any default named cadence with recipient_id of ajay dubey in it by calling create_cadence tool(do not call add_contacts_to_cadence)\n\n"
            "-' add laxmi in the cadence named zoho**'  → call add_contacts_to_cadence_tool with recipient id of laxmi and cadence name as zoho \n\n"
            "## Execution Types:\n"
            "- **sequential**: When dependencies exist between tools\n"
            "- **parallel**: When all tools are independent\n\n"
            "## Response Format:\n"
            "Return JSON with:\n"
            "- `execution_type`: 'sequential' or 'parallel'\n"
            "- `confidence`: float between 0.0 and 1.0\n"
            "- `reasoning`: explanation of your analysis\n"
            "- `dependencies`: object mapping step_N to array of dependencies\n"
            '  Example: {"step_1": ["step_0"], "step_3": ["step_0", "step_2"]}\n\n'
            "## Context-Aware Examples:\n"
            "### Example: When contacts and email already exist (CONTEXT-AWARE)\n"
            "**Previous Tool Results**: ✅ CONTACTS ALREADY FOUND, ✅ EMAIL ALREADY GENERATED\n"
            "**Current Tools**: create_cadence, add_contacts_to_cadence\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.95,\n'
            '  "reasoning": "Since contacts and email already exist from previous conversations, create_cadence is INDEPENDENT. Only add_contacts_to_cadence depends on create_cadence within current batch.",\n'
            '  "dependencies": {"step_1": ["step_0"]}\n'
            "}\n"
            "```\n\n"
            "## Standard Examples:\n"
            "### Example 1: Find contacts and their companies\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.95,\n'
            '  "reasoning": "\'their companies\' indicates search_companies depends on search_leads results",\n'
            '  "dependencies": {"step_1": ["step_0"]}\n'
            "}\n"
            "```\n\n"
            "### Example 2: Find contacts, generate email, create campaign\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.90,\n'
            '  "reasoning": "create_cadence depends on search_leads for contacts and generate_email for content",\n'
            '  "dependencies": {"step_2": ["step_0", "step_1"]}\n'
            "}\n"
            "```\n\n"
            "### Example 3: Independent searches\n"
            "```json\n"
            "{\n"
            '  "execution_type": "parallel",\n'
            '  "confidence": 0.85,\n'
            '  "reasoning": "All tools search independent data with no interdependencies",\n'
            '  "dependencies": {}\n'
            "}\n"
            "```\n\n"
            "### Example 4: create a cadence with abhay nawathey\n"
            "```json\n"
            "{\n"
            '  "execution_type": "parallel",\n'
            '  "confidence": 0.85,\n'
            '  "reasoning": "if you know recipient_ids of recipients, you can just call create_cadence(do not call add_contacts_to_cadence in this case because cadence do not already exist)",\n'
            '  "dependencies": {}\n'
            "}\n"
            "```\n\n"
            "### Example 5: Context-aware new search + existing campaign\n"
            "**Previous Tool Results**: ✅ CADENCE ALREADY EXISTS (Healthcare Outreach)\n"
            "**Current Tools**: search_leads, add_contacts_to_cadence\n"
            "**User**: 'Find more CEOs in fintech and add them to our Healthcare Outreach campaign'\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.95,\n'
            '  "reasoning": "search_leads is independent since its finding NEW contacts. add_contacts_to_cadence depends on search_leads results for recipient_ids.",\n'
            '  "dependencies": {"step_1": ["step_0"]}\n'
            "}\n"
            "```\n\n"
            "### Example 6: Mixed context - existing email + new search + new campaign\n"
            "**Previous Tool Results**: ✅ EMAIL ALREADY GENERATED\n"
            "**Current Tools**: search_leads, create_cadence, add_contacts_to_cadence\n"
            "**User**: 'Find directors in retail and create Retail Campaign with our standard email'\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.90,\n'
            '  "reasoning": "search_leads is independent. create_cadence depends on search_leads for recipients and is independent of email (already exists). add_contacts_to_cadence depends on both search and cadence creation.",\n'
            '  "dependencies": {"step_1": ["step_0"], "step_2": ["step_0", "step_1"]}\n'
            "}\n"
            "```\n\n"
            "### Example 7: Sequential requests - existing contacts + new search + campaign\n"
            "**Previous Tool Results**: ✅ CONTACTS ALREADY FOUND (Marketing managers)\n"
            "**Current Tools**: search_leads, create_cadence, add_contacts_to_cadence\n"
            "**User**: 'Create campaign for them and also find their CTOs'\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.85,\n'
            '  "reasoning": "search_leads (CTOs) is independent since its a new search. create_cadence is independent (uses existing contacts). add_contacts_to_cadence depends on both create_cadence AND search_leads to combine old contacts + new CTOs.",\n'
            '  "dependencies": {"step_2": ["step_0", "step_1"]}\n'
            "}\n"
            "```\n\n"
            "### Example 8: Complex dependency chain with context-building\n"
            "**Previous Tool Results**: ✅ COMPANIES ALREADY FOUND (Company Set A)\n"
            "**Current Tools**: search_leads, generate_email, create_cadence, add_contacts_to_cadence\n"
            "**User**: 'Now find their CEOs and create Fintech CEO Campaign with professional intro email'\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.95,\n'
            '  "reasoning": "search_leads uses existing company context (independent). generate_email is independent. create_cadence depends on both search_leads (recipients) and generate_email (content). add_contacts_to_cadence depends on create_cadence.",\n'
            '  "dependencies": {"step_2": ["step_0", "step_1"], "step_3": ["step_2"]}\n'
            "}\n"
            "```\n\n"
            "### Example 9: Multi-source contact combination\n"
            "**Previous Tool Results**: ✅ CONTACTS ALREADY FOUND (Contact Set 3), ✅ CADENCE ALREADY EXISTS (Campaign Y)\n"
            "**Current Tools**: search_leads, add_contacts_to_cadence\n"
            "**User**: 'Find tech startup founders, add them plus existing contacts to Campaign Y'\n"
            "```json\n"
            "{\n"
            '  "execution_type": "sequential",\n'
            '  "confidence": 0.90,\n'
            '  "reasoning": "search_leads is independent (new search). add_contacts_to_cadence depends on search_leads to combine existing Contact Set 3 + new founder contacts.",\n'
            '  "dependencies": {"step_1": ["step_0"]}\n'
            "}\n"
            "```\n\n"
            "### Example 10: Independent multi-search scenario\n"
            "**Current Tools**: search_companies, search_leads\n"
            "**User**: 'Find healthcare companies in Texas and get marketing directors in fintech'\n"
            "```json\n"
            "{\n"
            '  "execution_type": "parallel",\n'
            '  "confidence": 0.95,\n'
            '  "reasoning": "Two independent searches with different criteria - healthcare companies vs fintech marketing directors. No relationship indicated.",\n'
            '  "dependencies": {}\n'
            "}\n"
            "```\n\n"
            "### Example 11: Email generation and campaign creation\n"
            "**Current Tools**: generate_email, create_cadence\n"
            "**User**: 'Write an email and create a campaign'\n"
            "```json\n"
            "{\n"
            "  \"execution_type\": \"sequential\",\n"
            "  \"confidence\": 1.0,\n"
            "  \"reasoning\": \"create_cadence MUST wait for generate_email to complete as it needs the email template for template_details parameter\",\n"
            "  \"dependencies\": {\"step_1\": [\"step_0\"]}\n"
            "}\n"
            "```\n"
            "Analyze the user request and tool calls to determine the correct dependencies."
        )

        # Build tool call information
        tool_info = []
        for i, tool_call in enumerate(tool_calls):
            tool_name = tool_call["function"]["name"]
            tool_args = tool_call["function"]["arguments"]
            tool_info.append(f"**step_{i}**: {tool_name}")
            tool_info.append(f"Arguments: {tool_args}")

        user_content = (
            f"## User Request:\n"
            f'"{user_message}"\n\n'
            f"## Tool Calls:\n"
            f"{chr(10).join(tool_info)}\n\n"
            f"Analyze the dependencies and return JSON response:"
        )

        return [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_content},
        ]


class ExecutionStep:
    """Represents a single step in an execution plan."""

    def __init__(
        self,
        step_id: str,
        tool_name: str,
        tool_call_id: str,
        tool_args: Dict,
        description: str,
        depends_on: List[str] = None,
        use_previous_results: bool = False,
    ):
        self.step_id = step_id
        self.tool_name = tool_name
        self.tool_call_id = tool_call_id
        self.tool_args = tool_args
        self.description = description
        self.depends_on = depends_on or []
        self.use_previous_results = use_previous_results


class ExecutionPlan:
    """Represents a multi-step plan for the agent to execute."""

    def __init__(
        self, steps: List[ExecutionStep], execution_type: str, description: str
    ):
        self.steps = steps
        self.execution_type = execution_type
        self.description = description
        self.step_map = {step.step_id: step for step in steps}

    def get_ready_steps(self, completed_steps: List[str]) -> List[ExecutionStep]:
        """Gets all steps whose dependencies have been met."""
        ready = []
        completed_set = set(completed_steps)
        for step in self.steps:
            if step.step_id not in completed_set:
                # Check if step is marked for skipping
                if hasattr(step, "skip_reason") and step.skip_reason:
                    print(f"🚫 Skipping {step.step_id}: {step.skip_reason}")
                    # Mark as completed to prevent blocking other steps
                    completed_set.add(step.step_id)
                    completed_steps.append(step.step_id)
                    continue

                if all(dep in completed_set for dep in step.depends_on):
                    ready.append(step)
        return ready

    def is_complete(self, completed_steps: List[str]) -> bool:
        """Checks if all steps in the plan have been completed."""
        completed_set = set(completed_steps)
        total_steps = 0
        for step in self.steps:
            # Count skipped steps as completed
            if hasattr(step, "skip_reason") and step.skip_reason:
                completed_set.add(step.step_id)
            total_steps += 1
        return len(completed_set) == total_steps

    def to_serializable(self) -> dict:
        """Converts the ExecutionPlan to a serializable dictionary for LangGraph state storage."""
        steps_dicts = []
        for step in self.steps:
            step_dict = {
                "step_id": step.step_id,
                "tool_name": step.tool_name,
                "tool_call_id": step.tool_call_id,
                "tool_args": step.tool_args,
                "description": step.description,
                "depends_on": step.depends_on,
                "use_previous_results": step.use_previous_results,
            }
            # Include skip_reason if it exists
            if hasattr(step, "skip_reason") and step.skip_reason:
                step_dict["skip_reason"] = step.skip_reason
            steps_dicts.append(step_dict)

        return {
            "steps": steps_dicts,
            "execution_type": self.execution_type,
            "description": self.description,
        }

    @classmethod
    def from_serializable(cls, data: dict) -> "ExecutionPlan":
        """Creates an ExecutionPlan from a serializable dictionary."""
        steps = []
        for step_data in data.get("steps", []):
            step = ExecutionStep(
                step_id=step_data["step_id"],
                tool_name=step_data["tool_name"],
                tool_call_id=step_data.get(
                    "tool_call_id", f"call_{step_data['step_id']}"
                ),
                tool_args=step_data["tool_args"],
                description=step_data["description"],
                depends_on=step_data.get("depends_on", []),
                use_previous_results=step_data.get("use_previous_results", False),
            )
            # Restore skip_reason if it exists
            if "skip_reason" in step_data:
                step.skip_reason = step_data["skip_reason"]
            steps.append(step)

        return cls(
            steps=steps,
            execution_type=data.get("execution_type", "sequential"),
            description=data.get("description", "Execution plan"),
        )
