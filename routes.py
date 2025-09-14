from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import asyncio
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import uuid
import json
import httpx
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import Request
from fastapi.responses import JSONResponse
from sse_starlette import EventSourceResponse
from tools.create_cadence_tool import CadenceTool
from datetime import datetime, date, time
from clodura_client import CloduraClient
from mongo_client import MongoClient
from agent import LangGraphSalesAgent

load_dotenv()

USER_ID = "68c3e69d279836869a68f526"


class SessionInfoModel(BaseModel):
    session_id: str
    title: str


class SessionListResponse(BaseModel):
    sessions: list[SessionInfoModel]
    total_count: int


class SessionSummaryResponse(BaseModel):
    session_id: str
    exists: bool
    message_count: Optional[int] = None
    last_updated: Optional[str] = None
    file_size: Optional[int] = None
    error: Optional[str] = None


agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the agent on startup"""
    global agent
    try:
        load_dotenv()
        agent = LangGraphSalesAgent(
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
            clodura_token=os.getenv("CLODURA_TOKEN"),
            clodura_base_url=os.getenv("CLODURA_BASE_URL"),
            mongo_connection_url=os.getenv("MONGO_CONNECTION_URL"),
        )
        print("✅ LangGraph Sales Agent initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize LangGraph Sales Agent: {e}")
        raise e

    yield

    print("🔄 Shutting down...")


# Create FastAPI app with lifespan
app = FastAPI(
    title="AI Sales Assistant API (LangGraph)",
    description="LangGraph-powered Chat API for finding leads, contacts, and companies using OpenRouter and Clodura",
    version="2.0.0",
    lifespan=lifespan,
)


# Add timeout middleware
@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    # Set different timeouts for different endpoints
    if request.url.path.startswith("/chat"):
        timeout = 300  # 5 minutes for chat endpoints
    else:
        timeout = 60  # 1 minute for other endpoints

    try:
        return await asyncio.wait_for(call_next(request), timeout=timeout)
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={
                "error": "Request timeout",
                "message": f"Request took longer than {timeout} seconds",
            },
        )


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None


class ExecutePlanRequest(BaseModel):
    execution_type: str
    steps: list[dict]
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    type: str
    message: str
    tool_name: Optional[list[str]] = None
    data: Optional[Dict[Any, Any]] = None
    suggested_actions: Optional[list[str]] = None
    session_id: str
    tool_outputs: Optional[list[Dict[Any, Any]]] = None


class SessionInfoResponse(BaseModel):
    session_id: str
    conversation_length: int
    has_search_results: bool
    search_history_count: int
    latest_search_summary: Dict[str, int]


class ClearSessionResponse(BaseModel):
    message: str
    session_id: str


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI Sales Assistant API (LangGraph) is running",
        "status": "healthy",
        "version": "2.0.0",
        "framework": "LangGraph",
        "endpoints": {
            "chat": "/chat",
            "session_info": "/session/{session_id}",
            "clear_session": "/session/{session_id}/clear",
            "docs": "/docs",
        },
    }


# @app.post("/plan-preview")
# async def plan_preview_endpoint(request: ChatRequest):
#     """
#     Generate and stream execution plan without executing it.
#     """
#     global agent
#     if agent is None:
#         raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

#     session_id = request.session_id or str(uuid.uuid4())

#     async def event_stream():
#         """Stream plan generation events."""
#         print(f"⏳ Starting plan preview stream for session: {session_id}")
#         try:
#             # Send initial connection event
#             yield {
#                 "event": "connected",
#                 "data": json.dumps({
#                     "session_id": session_id,
#                     "message": "Generating execution plan preview",
#                 }),
#             }

#             # Stream plan generation only
#             async for chunk in agent.generate_plan_preview(request.message, session_id):
#                 event_type = chunk.get("type")

#                 if event_type == "plan_generated":
#                     # Plan generation complete
#                     plan = chunk.get("plan", {})
#                     yield {
#                         "event": "plan",
#                         "data": json.dumps({
#                             "execution_type": plan.get("execution_type"),
#                             "description": plan.get("description"),
#                             "steps": plan.get("steps", []),
#                             "session_id": session_id,
#                         }),
#                     }

#                     # Send completion event
#                     yield {
#                         "event": "done",
#                         "data": json.dumps({"message": "Plan generation completed"}),
#                     }
#                     break

#         except Exception as e:
#             import traceback
#             # Send error event
#             yield {
#                 "event": "error",
#                 "data": json.dumps({
#                     "error": str(e),
#                     "message": "An error occurred during plan generation"
#                 }),
#             }
#             print(f"❌ Error in plan preview stream for {session_id}: {traceback.format_exc()}")

#     return EventSourceResponse(event_stream())


# @app.post("/execute-plan")
# async def execute_plan_endpoint(request: ExecutePlanRequest):
#     """
#     Execute a pre-defined or edited execution plan.
#     """
#     global agent
#     if agent is None:
#         raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

#     session_id = request.session_id or str(uuid.uuid4())

#     async def event_stream():
#         """Stream plan execution events."""
#         print(f"⏳ Starting plan execution stream for session: {session_id}")
#         try:
#             # Send initial connection event
#             yield {
#                 "event": "connected",
#                 "data": json.dumps(
#                     {
#                         "session_id": session_id,
#                         "message": "Starting plan execution",
#                     }
#                 ),
#             }

#             # Execute the provided plan
#             async for chunk in agent.execute_provided_plan(
#                 request.execution_type, request.steps, session_id
#             ):
#                 event_type = chunk.get("type")

#                 if event_type == "progress":
#                     # Progress event
#                     progress = chunk.get("progress", {})
#                     yield {
#                         "event": "progress",
#                         "data": json.dumps(
#                             {
#                                 "node": chunk.get("node"),
#                                 "status": progress.get("status"),
#                                 "message": progress.get("message", ""),
#                                 "step_id": progress.get("step_id"),
#                                 "description": progress.get("description"),
#                                 "overall_progress": progress.get("overall_progress"),
#                                 "execution_time": progress.get("execution_time"),
#                                 "result_summary": progress.get("result_summary", {}),
#                             }
#                         ),
#                     }

#                 elif event_type == "final_result":
#                     # Final result event
#                     result = chunk.get("result", {})
#                     yield {
#                         "event": "result",
#                         "data": json.dumps(
#                             {
#                                 "type": result.get("type"),
#                                 "tool_name": result.get("tool_name"),
#                                 "message": result.get("message"),
#                                 "data": result.get("data", {}),
#                                 "session_id": session_id,
#                                 "suggested_actions": result.get(
#                                     "suggested_actions", []
#                                 ),
#                                 "tool_outputs": result.get("tool_outputs", []),
#                             }
#                         ),
#                     }

#                     # Send completion event
#                     yield {
#                         "event": "done",
#                         "data": json.dumps({"message": "Plan execution completed"}),
#                     }
#                     break

#         except Exception as e:
#             import traceback

#             # Send error event
#             yield {
#                 "event": "error",
#                 "data": json.dumps(
#                     {
#                         "error": str(e),
#                         "message": "An error occurred during plan execution",
#                     }
#                 ),
#             }
#             print(
#                 f"❌ Error in plan execution stream for {session_id}: {traceback.format_exc()}"
#             )

#     return EventSourceResponse(event_stream())


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint, now streaming progress via Server-Sent Events (SSE).
    """
    global agent
    if agent is None:
        raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

    session_id = request.session_id or str(uuid.uuid4())

    # Use provided model or fall back to agent's default model
    model_to_use = request.model or agent.model
    print(f"🤖 Using model: {model_to_use} for session: {session_id}")

    async def event_stream():
        """The async generator that yields SSE events."""
        print(f"⏳ Starting SSE stream for session: {session_id}")
        try:
            # Send initial connection event
            yield {
                "event": "connected",
                "data": json.dumps(
                    {
                        "session_id": session_id,
                        "message": "Connected to AI Sales Assistant",
                        "model": model_to_use,
                    }
                ),
            }

            # Stream events from the agent with specified model
            async for chunk in agent.chat(
                request.message, session_id, model=model_to_use
            ):
                event_type = chunk.get("type")

                if event_type == "title_update_triggered":
                    yield {
                        "event": "title_update_triggered",
                        "data": json.dumps({"session_id": session_id}),
                    }

                elif event_type == "plan_review":
                    # Plan review event - stream plan for user approval/editing
                    yield {
                        "event": "plan_review",
                        "data": json.dumps(
                            {
                                "plan": chunk.get("plan", {}),
                                "message": chunk.get("message", ""),
                                "session_id": session_id,
                            }
                        ),
                    }

                elif event_type == "progress":
                    # Progress event
                    progress = chunk.get("progress", {})
                    yield {
                        "event": "progress",
                        "data": json.dumps(
                            {
                                "node": chunk.get("node"),
                                "status": progress.get("status"),
                                "message": progress.get("message", ""),
                                "step_id": progress.get("step_id"),
                                "description": progress.get("description"),
                                "overall_progress": progress.get("overall_progress"),
                                "execution_time": progress.get("execution_time"),
                                "result_summary": progress.get("result_summary", {}),
                            }
                        ),
                    }

                elif event_type == "final_result":
                    # Final result event
                    result = chunk.get("result", {})
                    yield {
                        "event": "result",
                        "data": json.dumps(
                            {
                                "type": result.get("type"),
                                "tool_name": result.get("tool_name"),
                                "message": result.get("message"),
                                "data": result.get("data", {}),
                                "session_id": session_id,
                                "suggested_actions": result.get(
                                    "suggested_actions", []
                                ),
                                "tool_outputs": result.get("tool_outputs", []),
                            }
                        ),
                    }

                    # Send completion event
                    yield {
                        "event": "done",
                        "data": json.dumps({"message": "Workflow completed"}),
                    }
                    break

                # Small delay to prevent overwhelming the client
                # await asyncio.sleep(0.01)

        except Exception as e:
            import traceback

            # Send error event
            yield {
                "event": "error",
                "data": json.dumps(
                    {"error": str(e), "message": "An error occurred during processing"}
                ),
            }
            print(f"❌ Error in stream for {session_id}: {traceback.format_exc()}")

    return EventSourceResponse(event_stream())


@app.get("/session/{session_id}", response_model=SessionInfoResponse)
async def get_session_info(session_id: str):
    """
    Get information about a specific session
    """
    global agent

    if agent is None:
        raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

    try:
        session_info = agent.get_session_info(session_id)
        return SessionInfoResponse(**session_info)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting session info: {str(e)}"
        )


@app.delete("/session/{session_id}", response_model=ClearSessionResponse)
async def clear_session(session_id: str):
    """
    Clear all data for a specific session
    """
    global agent

    if agent is None:
        raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

    try:
        agent.clear_session(session_id)
        return ClearSessionResponse(
            message=f"Session {session_id} cleared successfully", session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing session: {str(e)}")


@app.get("/conversations/{session_id}")
async def get_conversation(session_id: str):
    """
    Get the full conversation history for a specific session
    """
    global agent

    if agent is None:
        raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

    try:
        conversation = agent.get_full_conversation(session_id)
        return conversation
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting conversation: {str(e)}"
        )


@app.get("/sessions", response_model=SessionListResponse)
async def list_sessions():
    """
    Get list of all available sessions
    """
    global agent

    if agent is None:
        raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

    try:
        sessions = agent.list_all_sessions()
        return SessionListResponse(sessions=sessions, total_count=len(sessions))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing sessions: {str(e)}")


@app.get("/sessions/{session_id}/summary", response_model=SessionSummaryResponse)
async def get_session_summary(session_id: str):
    """
    Get summary information about a specific session
    """
    global agent

    if agent is None:
        raise HTTPException(status_code=500, detail="LangGraph agent not initialized")

    try:
        if agent.storage_manager:
            summary = agent.storage_manager.get_session_summary(session_id)
            return SessionSummaryResponse(**summary)
        else:
            # Fallback for memory-only mode
            agent._initialize_session(session_id)
            conversation = agent.memory[session_id]["conversation_history"]
            return SessionSummaryResponse(
                session_id=session_id,
                exists=True,
                message_count=len(conversation),
                last_updated=None,
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting session summary: {str(e)}"
        )


CLODURA_LIST_URL = f"https://app.clodura.ai/api/list/getList/{USER_ID}"
UNLOCK_BULK_URL = f"https://app.clodura.ai/api/radar/unlockBulkContacts/{USER_ID}"


@app.get("/proxy/clodura_list")
async def proxy_clodura_list(request: Request):
    try:
        load_dotenv()
        headers = {
            "Authorization": f"Bearer {os.getenv('CLODURA_TOKEN')}",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(CLODURA_LIST_URL, headers=headers)
            print(f"response: {response}")

        return JSONResponse(status_code=response.status_code, content=response.json())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


CREATE_CADENCE_URL = "https://app.clodura.ai/api/seq/addsequence"
ADD_STEP_BASE_URL = "https://app.clodura.ai/api/seq/step"
ADD_RECIPIENTS_URL = "https://app.clodura.ai/api/radar/create/addListToSeq/campaign"


@app.post("/proxy/create_new_cadence")
async def proxy_create_new_cadence(request: Request):
    """
    Proxy endpoint to create a complete cadence with steps and recipients

    Expected request body:
    {
        "name": "Campaign Name",
        "type": "constant",
        "tags": ["sales", "outreach"],
        "schedule": {
            "startDate": {"year": 2025, "month": 7, "day": 15},
            "startTime": {"hour": 9, "minute": 0, "second": 0},
            "whiteDays": ["Mo", "Tu", "We", "Th", "Fr"]
        },
        "listType": "",
        "listId": null,
        "toEmails": [],
        "isActive": true,
        "status": "paused",
        "copyTempPhases": false,
        "template": {
            "subject": "Email Subject",
            "body": "Email Body Content"
        },
        "recipients": ["recipient_id_1", "recipient_id_2"]
    }
    """
    try:

        load_dotenv()

        user_id = os.getenv("USER_ID")
        clodura_token = os.getenv("CLODURA_TOKEN")
        clodura_base_url: str = "https://app.clodura.ai"
        mongo_connection_url: str = "mongodb://host.docker.internal:27017"

        mongo_client = MongoClient(
            connection_string=mongo_connection_url,
            db_name="ai-sdr",
            open_router_logs_collection="llm_requests",
            conversations_collection="conversations",
        )

        clodura_client = CloduraClient(
            clodura_base_url, clodura_token, user_id, mongo_client
        )

        this_cadence_tool = CadenceTool(user_id=user_id, clodura_client=clodura_client)

        print("hello hello there")
        if not user_id or not clodura_token:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Missing USER_ID or CLODURA_TOKEN environment variables"
                },
            )

        headers = {
            "Authorization": f"Bearer {clodura_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://app.clodura.ai",
            "Referer": "https://app.clodura.ai/",
            "User-Agent": request.headers.get("User-Agent", "Mozilla/5.0"),
            "sec-ch-ua": request.headers.get("sec-ch-ua", ""),
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
        }

        # Get request body
        body = await request.json()

        # Extract required fields
        name = body.get("name", "")
        cadence_type = body.get("type", "constant")
        tags = body.get("tags", [])
        schedule = body.get("schedule", {})
        list_type = body.get("listType", "")
        list_id = body.get("listId")
        to_emails = body.get("toEmails", [])
        is_active = body.get("isActive", True)
        status = body.get("status", "paused")
        copy_temp_phases = body.get("copyTempPhases", False)
        template_details = body.get("template", {})
        recipients = body.get("recipients", [])

        # Set default schedule if not provided
        if not schedule:
            today = date.today()
            now = datetime.now().time()
            schedule = {
                "startDate": {
                    "year": today.year,
                    "month": today.month,
                    "day": today.day,
                },
                "startTime": {
                    "hour": now.hour,
                    "minute": now.minute,
                    "second": now.second,
                },
                "whiteDays": ["Mo", "Tu", "We", "Th", "Fr"],
            }

        print("sending cadence payload")
        # Prepare cadence creation payload
        cadence_payload = {
            "name": name,
            "type": cadence_type,
            "tags": tags,
            "schedule": schedule,
            "listType": list_type,
            "listId": list_id,
            "toEmails": to_emails,
            "steps": [],
            "isActive": is_active,
            "status": status,
            "copyTempPhases": copy_temp_phases,
            "userId": user_id,
        }

        async with httpx.AsyncClient() as client:
            # STEP 1: Create Cadence
            print(f"📧 Creating cadence: {name}")
            print(f"📋 Cadence Payload: {cadence_payload}")

            cadence_response = await client.post(
                f"{CREATE_CADENCE_URL}/{user_id}", headers=headers, json=cadence_payload
            )

            if cadence_response.status_code != 200:
                print("failed to create cadence")
                return JSONResponse(
                    status_code=cadence_response.status_code,
                    content={
                        "error": f"Failed to create cadence: {cadence_response.text}"
                    },
                )

            cadence_data = cadence_response.json()
            cadence_id = cadence_data.get("_id", {}).get("$oid")

            if not cadence_id:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Failed to get cadence ID from response"},
                )

            print(f"✅ Cadence created with ID: {cadence_id}")

            # STEP 2: Add Step to Cadence
            email_body = template_details.get("body", "")
            email_subject = template_details.get("subject", "")

            print("sending step payload")
            step_payload = {
                "id": this_cadence_tool.nanoid(8),
                "name": "Email Phase 1",
                "sequenceName": name,
                "order": 0,
                "type": "email",
                "isEvent": False,
                "status": "paused",
                "userId": user_id,
                "schedule": {
                    "startDate": schedule.get("startDate", {}),
                    "startTime": schedule.get("startTime", {}),
                    "endDate": [],
                    "endTime": [],
                    "blackDays": [],
                    "whiteDays": schedule.get(
                        "whiteDays", ["Mo", "Tu", "We", "Th", "Fr"]
                    ),
                    "offTime": None,
                },
                "interval": {"number": 0, "mode": "Day"},
                "steps": [],
                "reportId": "",
                "templateId": None,
                "listId": "",
                "nextStep": "",
                "includeOriginal": False,
                "addUnsubLink": True,
                "notifyMe": False,
                "sequenceId": cadence_id,
                "prevStep": None,
                "template": this_cadence_tool.create_new_template(
                    4, email_body, email_subject
                ),
            }

            print(f"📧 Adding step to cadence")
            print(f"📋 Step Payload: {step_payload}")

            step_response = await client.post(
                f"{ADD_STEP_BASE_URL}/{user_id}/{cadence_id}",
                headers=headers,
                json=step_payload,
            )

            if step_response.status_code != 200:
                print(f"⚠️  Failed to add step: {step_response.text}")
                # Continue with adding recipients even if step fails
            else:
                step_data = step_response.json()
                print(f"✅ Step added successfully: {step_data}")

            print("sending recipients payload")
            # STEP 3: Add Recipients to Cadence
            if recipients:
                recipients_payload = {
                    "userId": user_id,
                    "name": name,
                    "source": "clodura",
                    "recipients": recipients,
                    "planName": "Starter",
                    "pageFlage": "contactSearch",
                    "action": "add",
                    "sequenceId": cadence_id,
                }

                print(f"📧 Adding recipients to cadence")
                print(f"📋 Recipients Payload: {recipients_payload}")

                recipients_response = await client.post(
                    ADD_RECIPIENTS_URL, headers=headers, json=recipients_payload
                )

                if recipients_response.status_code != 200:
                    print(f"⚠️  Failed to add recipients: {recipients_response.text}")
                    # Return success but note recipient addition failed
                    return JSONResponse(
                        status_code=200,
                        content={
                            "status": "partial_success",
                            "message": f"Cadence '{name}' and step created successfully, but failed to add recipients",
                            "cadence_id": cadence_id,
                            "cadence_name": name,
                            "recipients_ids": recipients,
                            "data": cadence_data,
                            "recipient_error": recipients_response.text,
                        },
                    )
                else:
                    recipients_data = recipients_response.json()
                    print(f"✅ Recipients added successfully: {recipients_data}")

            # Return success response
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "message": f"Cadence '{name}' created successfully with step and recipients",
                    "cadence_id": cadence_id,
                    "cadence_name": name,
                    "recipients_ids": recipients,
                    "data": cadence_data,
                },
            )

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return JSONResponse(
            status_code=500, content={"error": f"Unexpected error: {str(e)}"}
        )


@app.post("/proxy/unlock_bulk_contacts")
async def proxy_unlock_bulk_contacts(request: Request):
    try:
        headers = {
            "Authorization": f"Bearer {os.getenv('CLODURA_TOKEN')}",
            "Content-Type": "application/json",
            "Origin": "https://app.clodura.ai",
            "Referer": "https://app.clodura.ai/",
            "User-Agent": request.headers.get("User-Agent", "Mozilla"),
            "sec-ch-ua": request.headers.get("sec-ch-ua", ""),
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
        }

        async with httpx.AsyncClient() as client:
            body = await request.json()
            response = await client.post(UNLOCK_BULK_URL, headers=headers, json=body)

        return JSONResponse(status_code=response.status_code, content=response.json())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


CAMPAIGN_CREATE_URL = "https://app.clodura.ai/api/radar/create/list/campaign"


@app.post("/proxy/create_campaign_list")
async def proxy_create_campaign_list(request: Request):
    try:
        headers = {
            "Authorization": f"Bearer {os.getenv('CLODURA_TOKEN')}",
            "Content-Type": "application/json",
            "Origin": "https://app.clodura.ai",
            "Referer": "https://app.clodura.ai/",
            "User-Agent": request.headers.get("User-Agent", "Mozilla"),
            "sec-ch-ua": request.headers.get("sec-ch-ua", ""),
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
        }

        async with httpx.AsyncClient() as client:
            body = await request.json()
            response = await client.post(
                CAMPAIGN_CREATE_URL, headers=headers, json=body
            )

        return JSONResponse(status_code=response.status_code, content=response.json())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.put("/proxy/update_campaign_list/{campaign_id}")
async def proxy_update_campaign_list(campaign_id: str, request: Request):
    try:
        url = f"https://app.clodura.ai/api/radar/update/list/campaign/{campaign_id}"
        headers = {
            "Authorization": f"Bearer {os.getenv('CLODURA_TOKEN')}",
            "Content-Type": "application/json",
            # "Origin": "https://app.clodura.ai",
            # "Referer": "https://app.clodura.ai/",
            # "User-Agent": request.headers.get("User-Agent", "Mozilla"),
            # "sec-ch-ua": request.headers.get("sec-ch-ua", ""),
            # "sec-ch-ua-mobile": "?0",
            # "sec-ch-ua-platform": '"macOS"',
        }

        async with httpx.AsyncClient() as client:
            body = await request.json()
            response = await client.put(url, headers=headers, json=body)

        return JSONResponse(status_code=response.status_code, content=response.json())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


TAG_ID = USER_ID


@app.post("/proxy/clodura/tag-sequences")
async def proxy_tag_sequences(request: Request):
    try:
        body = await request.json()
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://app.clodura.ai/api/seq/sequences/search/tags/68c3e69d279836869a68f526",
                headers={
                    "Accept": "application/json, text/plain, */*",
                    "Authorization": f"Bearer {os.getenv('CLODURA_TOKEN')}",
                    "Content-Type": "application/json",
                    # Skip cookie header for now; if session required, pass via BE
                },
                json=body,
            )
            print(f"response: {response}")
        return JSONResponse(status_code=response.status_code, content=response.json())
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/health")
async def health_check():
    """Detailed health check"""
    global agent

    return {
        "status": "healthy" if agent is not None else "unhealthy",
        "agent_initialized": agent is not None,
        "framework": "LangGraph",
        "version": "2.0.0",
        "environment": {
            "openrouter_api_key_set": bool(os.getenv("OPENROUTER_API_KEY")),
            "clodura_token_set": bool(os.getenv("CLODURA_TOKEN")),
        },
    }


if __name__ == "__main__":
    import uvicorn

    load_dotenv()

    # Check for required environment variables
    if not os.getenv("OPENROUTER_API_KEY"):
        print("❌ OPENROUTER_API_KEY environment variable is required")
        exit(1)

    if not os.getenv("CLODURA_TOKEN"):
        print("❌ CLODURA_TOKEN environment variable is required")
        exit(1)

    print("🚀 Starting LangGraph AI Sales Assistant API...")
    print("📚 API documentation will be available at: http://localhost:8000:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)

    # load_dotenv()
    # agent = LangGraphSalesAgent(
    #     openrouter_api_key=os.getenv("OPENROUTER_API_KEY"),
    #     model="anthropic/claude-3.5-sonnet",
    #     clodura_token=os.getenv("CLODURA_TOKEN"),
    # )

    # my_plan = ExecutionPlan(
    #     execution_type="parallel",
    #     description="Simultaneously find tech companies and senior leads in California.",
    #     steps=[
    #         ExecutionStep(
    #             step_id="step_0",
    #             tool_name="search_companies",
    #             tool_args={
    #                 "industry": ["Banking", "Capital Markets"],
    #                 "hqState": ["California"],
    #                 "limit": 2,
    #             },
    #             description="Find technology companies in California",
    #             depends_on=[],
    #             use_previous_results=False,
    #         ),
    #         ExecutionStep(
    #             step_id="step_1",
    #             tool_name="search_leads",
    #             tool_args={"seniority": ["Founder"], "state": ["California"],"limit": 2},
    #             description="Find C-level leads in California",
    #             depends_on=["step_0"],
    #             use_previous_results=False,
    #         ),
    #         ExecutionStep(
    #             step_id="step_2",
    #             tool_name="generate_email",
    #             tool_args={
    #                 "tone": "Polite",
    #                 "email_type": "reach out",
    #                 "purpose": "First introduction call",
    #             },
    #             description="Generate Email Content",
    #             depends_on=[],
    #             use_previous_results=False,
    #         ),
    #         ExecutionStep(
    #             step_id="step_3",
    #             tool_name="create_cadence",
    #             tool_args={
    #                 "name": "Demo Cadence New Contacts Test",
    #                 "cadence_type": "constant",
    #                 "tags": ["Development"],
    #                 "start_date": {"year": 2025, "month": 7, "day": 9},
    #                 "start_time": {"hour": 10, "minute": 0, "second": 0},
    #                 "white_days": ["Mo", "Tu", "We", "Th", "Fr"],
    #                 # "list_type": "contacts", pass as null
    #                 # "list_id": "list_123456",
    #                 "to_emails": [],
    #                 "is_active": False,
    #                 "status": "paused",
    #             },
    #             description="Find C-level leads in California",
    #             depends_on=["step_2","step_1"],
    #             use_previous_results=True,
    #         ),
    #     ],
    # )

    # # 3. Execute the plan directly using the new utility function
    # session_id = "direct_exec_session_002"
    # print(f"\n--- Executing pre-defined plan for session: {session_id} ---")

    # # This call bypasses the graph entirely
    # final_response = agent.direct_execute_plan(
    #     plan=my_plan, session_id=session_id + "_" + str(uuid.uuid4())
    # )

    # print("\n--- FINAL RESULT FROM DIRECT EXECUTION ---")
    # import json

    # print(json.dumps(final_response, indent=2))

    # print("\n--- Continuing conversation with normal chat ---")
    # for event in agent.chat(message="Based on the companies found, who is the best person to contact?", session_id=session_id):
    #     if event["type"] == "final_result":
    #         print("\n--- LLM-DRIVEN FOLLOW-UP RESULT ---")
    #         print(json.dumps(event["result"], indent=2))
