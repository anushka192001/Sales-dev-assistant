import uuid
import requests
import httpx
import json
import logging
import time
import asyncio
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
from mongo_client import MongoClient


class ResponseFormat(Enum):
    """Supported response formats"""

    TEXT = "text"
    JSON = "json_object"


@dataclass
class RequestStats:
    """Statistics for API requests"""

    total_requests: int = 0
    total_tokens: int = 0
    total_errors: int = 0

    @property
    def avg_tokens_per_request(self) -> float:
        return (
            self.total_tokens / self.total_requests if self.total_requests > 0 else 0.0
        )


class OpenRouterClient:
    """Client for OpenRouter API interactions with logging"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://openrouter.ai/api/v1/chat/completions",
        # default_model: str = "openai/gpt-4o-mini",
        enable_logging: bool = True,
        log_level: str = "INFO",
        mongo_logger: Optional[MongoClient] = None,
    ):
        """
        Initialize OpenRouter client

        Args:
            api_key: OpenRouter API key
            base_url: Full API endpoint URL
            default_model: Default model to use for requests
            enable_logging: Whether to enable detailed logging
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
            mongo_logger: Optional MongoDB logger instance
        """
        self.api_key = api_key
        self.base_url = base_url
        # self.default_model = default_model
        self.mongo_logger = mongo_logger
        self.stats = RequestStats()

        # Setup logging - avoid duplicate handlers
        self.logger = logging.getLogger("OpenRouterClient")
        if enable_logging and not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(getattr(logging, log_level.upper()))

    async def chat_completion(
        self,
        session_id: str,
        purpose: str,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        tools: Optional[List[Dict]] = None,
        response_format: ResponseFormat = ResponseFormat.TEXT,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        timeout: Optional[int] = None,
        prefer_provider: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, str]:
        """
        Make a chat completion request to OpenRouter

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model to use (defaults to self.default_model)
            tools: Optional list of tool definitions
            response_format: Response format (TEXT or JSON)
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens in response
            top_p: Top-p sampling parameter (0.0-1.0)
            timeout: Optional[int] = None,
            prefer_provider: Preferred provider for the model
            **kwargs: Additional parameters to pass to the API

        Returns:
            Dict containing the API response

        Raises:
            requests.RequestException: For network errors
            ValueError: For invalid responses
        """
        request_id = str(uuid.uuid4())

        ALLOWED_MESSAGE_KEYS = {
            "role",
            "content",
            "tool_calls",
            "tool_call_id",
            "name",
            "function_call",
        }

        # Clean messages to remove disallowed keys
        for i, message in enumerate(messages):
            extras = set(message) - ALLOWED_MESSAGE_KEYS
            if extras:
                self.logger.debug(
                    f"Removing disallowed keys from message {i}: {extras}"
                )

        sanitized_messages = [
            {k: v for k, v in message.items() if k in ALLOWED_MESSAGE_KEYS}
            for message in messages
        ]

        # Build request payload - only include non-None values
        request_payload = {"model": model, "messages": sanitized_messages, **kwargs}

        # Add optional parameters only if specified
        if temperature is not None:
            request_payload["temperature"] = temperature
        if max_tokens is not None:
            request_payload["max_tokens"] = max_tokens
        if top_p is not None:
            request_payload["top_p"] = top_p
        if tools:
            request_payload["tools"] = tools
        if response_format == ResponseFormat.JSON:
            request_payload["response_format"] = {"type": "json_object"}

        # Build headers
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "tool_choice": "auto",
        }

        if prefer_provider:
            headers["OpenRouter-Prefer-Provider"] = prefer_provider

        # Log and make request
        self._log_request(model, purpose, messages, request_payload, request_id)

        start_time = time.time()
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=request_payload,
                    timeout=timeout if timeout is not None else 30,
                )
                print(f"response {response.text}")
                response.raise_for_status()

        except httpx.RequestError as e:
            elapsed_time = time.time() - start_time
            self.logger.error(f"HTTP Request Error: {e}")
            self._log_error(
                model, session_id, e, elapsed_time, request_id, request_payload
            )
            self.stats.total_errors += 1
            raise

        # Parse response
        try:
            result = response.json()

            # Check for OpenRouter error format
            if "error" in result:
                error_info = result["error"]
                error_message = error_info.get("message", "Unknown error")

                # Extract the actual provider error if available
                metadata = error_info.get("metadata", {})
                if "raw" in metadata:
                    try:
                        provider_error = json.loads(metadata["raw"])
                        provider_message = provider_error.get("message", error_message)
                        error_message = f"{error_message}: {provider_message}"
                    except:
                        pass

                elapsed_time = time.time() - start_time
                self._log_error(
                    model,
                    session_id,
                    error_message,
                    elapsed_time,
                    request_id,
                    request_payload,
                    response.text,
                )
                self.stats.total_errors += 1
                raise ValueError(f"API error: {error_message}")

        except json.JSONDecodeError as e:
            elapsed_time = time.time() - start_time
            self._log_error(
                model,
                session_id,
                f"JSON decode error: {e}",
                elapsed_time,
                request_id,
                request_payload,
                response.text,
            )
            self.stats.total_errors += 1
            raise ValueError(f"Invalid JSON response: {e}")

        # Log response and update stats
        elapsed_time = time.time() - start_time
        self._log_response(
            model,
            purpose,
            session_id,
            result,
            elapsed_time,
            request_id,
            request_payload,
        )

        self.stats.total_requests += 1
        if "usage" in result:
            self.stats.total_tokens += result["usage"].get("total_tokens", 0)

        return result

    async def chat_completion_with_retries(
        self,
        session_id: str,
        purpose: str,
        messages: List[Dict[str, str]],
        model_fallbacks: Optional[List[str]] = None,
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        **kwargs,
    ) -> Optional[Dict[str, str]]:
        """
        Attempt chat completion with retries and model fallbacks

        Args:
            messages: List of message dictionaries
            model_fallbacks: Ordered list of models to try (includes primary model)
            max_retries: Maximum retries per model
            backoff_factor: Exponential backoff multiplier
            **kwargs: Additional parameters for chat_completion

        Returns:
            Dict containing the API response, or None if all attempts fail
        """
        models_to_try = model_fallbacks

        for model in models_to_try:
            for attempt in range(max_retries):
                try:
                    self.logger.info(
                        f"Trying {model} (attempt {attempt + 1}/{max_retries})"
                    )

                    result = await self.chat_completion(
                        messages=messages,
                        purpose=purpose,
                        session_id=session_id,
                        model=model,
                        **kwargs,
                    )

                    self.logger.info(f"✅ Success with {model}")
                    return result

                except Exception as e:
                    self.logger.warning(
                        f"❌ {model} failed (attempt {attempt + 1}): {str(e)}"
                    )

                    if attempt < max_retries - 1:
                        sleep_time = backoff_factor**attempt
                        self.logger.info(f"Retrying in {sleep_time:.1f}s...")
                        await asyncio.sleep(sleep_time)

        self.logger.error("All models and retries exhausted")
        return None

    def extract_content(self, response: Dict[str, str]) -> str:
        """Extract content from OpenRouter response"""
        try:
            content = response["choices"][0]["message"]["content"]
            return content or ""  # Return empty string if content is None
        except (KeyError, IndexError, TypeError) as e:
            self.logger.error(f"Failed to extract content: {e}")
            return ""

    def extract_tool_calls(self, response: Dict[str, str]) -> List[Dict]:
        """Extract tool calls from OpenRouter response"""
        try:
            
            return response["choices"][0]["message"].get("tool_calls", [])
        except (KeyError, IndexError, TypeError) as e:
            self.logger.error(f"Failed to extract tool calls: {e}")
            return []

    def get_stats(self) -> Dict[str, float]:
        """Get client statistics"""
        return {
            "total_requests": self.stats.total_requests,
            "total_tokens_used": self.stats.total_tokens,
            "total_errors": self.stats.total_errors,
            "average_tokens_per_request": self.stats.avg_tokens_per_request,
            "success_rate": (
                (self.stats.total_requests - self.stats.total_errors)
                / self.stats.total_requests
                if self.stats.total_requests > 0
                else 0.0
            ),
        }

    def reset_stats(self):
        """Reset client statistics"""
        self.stats = RequestStats()
        self.logger.info("Client statistics reset")

    def _log_request(
        self,
        purpose: str,
        model: str,
        messages: List[Dict],
        payload: Dict,
        request_id: str,
    ):
        """Log request details"""
        self.logger.info(f"🚀 Request {request_id[:8]} to {model} {purpose}")
        self.logger.info(f"   Messages: {len(messages)}")

        if "tools" in payload:
            self.logger.info(f"   Tools: {len(payload['tools'])}")

        # Log user message preview
        user_messages = [m for m in messages if m.get("role") == "user"]
        if user_messages:
            content = user_messages[-1]["content"]
            preview = content[:100] + "..." if len(content) > 100 else content
            self.logger.info(f"   User: {preview}")

        # VERBOSE: Log full request payload
        if self.logger.isEnabledFor(logging.DEBUG):
            self.logger.debug(f"📝 FULL REQUEST PAYLOAD for {request_id[:8]}:")
            self.logger.debug(f"   Model: {model}")
            self.logger.debug(f"   Complete Messages ({len(messages)}):")
            for i, msg in enumerate(messages):
                role = msg.get("role", "unknown")
                content = msg.get("content", "")
                self.logger.debug(f"     [{i}] {role}: {content}")
                if "tool_calls" in msg:
                    self.logger.debug(f"         tool_calls: {msg['tool_calls']}")
                if "tool_call_id" in msg:
                    self.logger.debug(f"         tool_call_id: {msg['tool_call_id']}")

            if "tools" in payload:
                self.logger.debug(f"   Available Tools ({len(payload['tools'])}):")
                for i, tool in enumerate(payload["tools"]):
                    tool_name = tool.get("function", {}).get("name", "unknown")
                    self.logger.debug(f"     [{i}] {tool_name}")
                    self.logger.debug(f"         schema: {tool}")

            # Log other parameters
            for key, value in payload.items():
                if key not in ["model", "messages", "tools"]:
                    self.logger.debug(f"   {key}: {value}")

            self.logger.debug(f"📝 END REQUEST PAYLOAD for {request_id[:8]}")

    def _log_response(
        self,
        model: str,
        purpose: str,
        session_id: str,
        response: Dict,
        elapsed_time: float,
        request_id: str,
        request_payload: Dict,
    ):
        """Log response details"""
        self.logger.info(
            f"✅ Response {request_id[:8]} from {model} ({elapsed_time:.2f}s)"
        )

        if "usage" in response:
            usage = response["usage"]
            self.logger.info(
                f"   Tokens: {usage.get('prompt_tokens', 0)} + {usage.get('completion_tokens', 0)} = {usage.get('total_tokens', 0)}"
            )

        # Log additional metadata
        if "model" in response and response["model"] != model:
            self.logger.info(f"   Actual model: {response['model']}")
        if "provider" in response:
            self.logger.info(f"   Provider: {response['provider']}")

        # Log tool calls
        tool_calls = self.extract_tool_calls(response)
        if tool_calls:
            tools_used = [
                call.get("function", {}).get("name", "unknown") for call in tool_calls
            ]
            self.logger.info(f"   Tools called: {', '.join(tools_used)}")

        # VERBOSE: Log full response payload
        if self.logger.isEnabledFor(logging.DEBUG):
            self.logger.debug(f"📋 FULL RESPONSE PAYLOAD for {request_id[:8]}:")
            self.logger.debug(f"   Status: Success")
            self.logger.debug(f"   Elapsed Time: {elapsed_time:.2f}s")

            # Log all choices
            choices = response.get("choices", [])
            self.logger.debug(f"   Choices ({len(choices)}):")
            for i, choice in enumerate(choices):
                message = choice.get("message", {})
                content = message.get("content", "")
                role = message.get("role", "unknown")

                self.logger.debug(f"     [{i}] {role}: {content}")

                # Log tool calls in detail
                if "tool_calls" in message and message["tool_calls"]:
                    self.logger.debug(f"     [{i}] Tool Calls:")
                    for j, tool_call in enumerate(message["tool_calls"]):
                        func_name = tool_call.get("function", {}).get("name", "unknown")
                        func_args = tool_call.get("function", {}).get("arguments", "{}")
                        call_id = tool_call.get("id", "unknown")
                        self.logger.debug(
                            f"       [{j}] {func_name}({func_args}) [id: {call_id}]"
                        )

                # Log finish reason
                finish_reason = choice.get("finish_reason", "unknown")
                self.logger.debug(f"     [{i}] Finish Reason: {finish_reason}")

            # Log usage details
            if "usage" in response:
                usage = response["usage"]
                self.logger.debug(f"   Usage Details:")
                for key, value in usage.items():
                    self.logger.debug(f"     {key}: {value}")

            # Log model info
            self.logger.debug(f"   Model Info:")
            self.logger.debug(f"     Requested: {model}")
            self.logger.debug(f"     Actual: {response.get('model', 'unknown')}")
            self.logger.debug(f"     Provider: {response.get('provider', 'unknown')}")

            # Log other response fields
            for key, value in response.items():
                if key not in ["choices", "usage", "model", "provider"]:
                    self.logger.debug(f"   {key}: {value}")

            self.logger.debug(f"📋 END RESPONSE PAYLOAD for {request_id[:8]}")

        # MongoDB logging
        if self.mongo_logger:

            usage = response.get("usage", {})
            log_data = {
                "request_id": request_id,
                "model": model,
                "actual_model_used": response.get("model"),
                "provider": response.get("provider"),
                "input_tokens": usage.get("prompt_tokens"),
                "output_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"),
                "request_payload": request_payload,
                "response_payload": response,
                "elapsed_time": elapsed_time,
                "successful": True,
                "session_id": session_id,
                "purpose": purpose,
            }
            self.mongo_logger.log_llm_request(log_data)

    def _log_error(
        self,
        model: str,
        session_id: str,
        error: Exception,
        elapsed_time: float,
        request_id: str,
        request_payload: Dict,
        response_text: Optional[str] = None,
    ):
        """Log error details"""
        self.logger.error(
            f"❌ Error {request_id[:8]} with {model} ({elapsed_time:.2f}s): {str(error)}"
        )

        # VERBOSE: Log full error details
        if self.logger.isEnabledFor(logging.DEBUG):
            self.logger.debug(f"💥 FULL ERROR DETAILS for {request_id[:8]}:")
            self.logger.debug(f"   Model: {model}")
            self.logger.debug(f"   Session ID: {session_id}")
            self.logger.debug(f"   Error Type: {type(error).__name__}")
            self.logger.debug(f"   Error Message: {str(error)}")
            self.logger.debug(f"   Elapsed Time: {elapsed_time:.2f}s")

            if response_text:
                self.logger.debug(f"   Raw Response: {response_text}")

            self.logger.debug(f"   Original Request Payload:")
            for key, value in request_payload.items():
                if key == "messages":
                    self.logger.debug(f"     {key}: {len(value)} messages")
                    for i, msg in enumerate(value):
                        role = msg.get("role", "unknown")
                        content_preview = str(msg.get("content", ""))[:100]
                        self.logger.debug(f"       [{i}] {role}: {content_preview}...")
                else:
                    self.logger.debug(f"     {key}: {value}")

            self.logger.debug(f"💥 END ERROR DETAILS for {request_id[:8]}")

        if self.mongo_logger:
            log_data = {
                "request_id": request_id,
                "model": model,
                "session_id": session_id,
                "error_message": str(error),
                "request_payload": request_payload,
                "response_text": response_text,
                "elapsed_time": elapsed_time,
                "successful": False,
            }
            self.mongo_logger.log_llm_request(log_data)
