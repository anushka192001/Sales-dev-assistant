import re
import uuid
from typing import Dict, Any, Optional
from LLM.open_router_client import OpenRouterClient


class EmailGeneratorTool:
    """
    Tool to generate emails based on specified parameters using OpenRouter AI API.
    Now uses OpenRouterClient for better maintainability, logging, and error handling.

    Attributes:
        client (OpenRouterClient): OpenRouter client instance for API interactions.
        model (str): The AI model to use for email generation.
    """

    def __init__(self, client: OpenRouterClient, model: str = "openai/gpt-4o-mini"):
        """
        Initialize EmailGeneratorTool with OpenRouter client.

        Args:
            client (OpenRouterClient): Configured OpenRouter client instance
            model (str): AI model to use for email generation
        """
        self.client = client
        self.model = model

    def _to_snake_case(self, name: str) -> str:
        """Converts a string to snake_case."""
        # Replace spaces, apostrophes, and hyphens with underscores
        name = re.sub(r"[\s'-]", "_", name)
        # Remove any characters that are not alphanumeric or underscore
        name = re.sub(r"[^a-zA-Z0-9_]", "", name)
        return name.lower()

    async def generate_email(
        self,
        tone: str = "professional",
        email_type: str = "outreach",
        purpose: str = "general outreach",
        example: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates an email based on the provided tone, type, purpose, and an optional example.

        Args:
            tone (str): The desired tone of the email (e.g., "formal", "casual", "assertive").
            email_type (str): The type of email (e.g., "business", "education", "reach out", "campaign").
            purpose (str): The main purpose or objective of the email.
            example (Optional[str]): An optional example of an email or specific phrases to guide generation.
            session_id (Optional[str]): Session ID for tracking. If None, generates a new one.

        Returns:
            Dict[str, Any]: A dictionary containing the generated email content, or an error message.
        """
        # Generate session ID if not provided
        if session_id is None:
            session_id = str(uuid.uuid4())

        # Build user content
        user_content_parts = [
            f"Generate an email with the following characteristics:\n",
            f"Tone: {tone}\n",
            f"Type: {email_type}\n",
            f"Purpose: {purpose}\n",
        ]

        if example:
            user_content_parts.append(f"Example: {example}\n")

        user_content_parts.append(
            f"Please provide only the subject and the body of the email. "
            f"Ensure all dynamic placeholders are in the [snake_case] format."
        )

        user_content = "".join(user_content_parts)

        # Prepare messages for OpenRouter
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an AI assistant that generates emails. For all dynamic placeholders, "
                    "strictly use the format [snake_case_placeholder]. For example, use [recipient_name], "
                    "[your_company_name], [meeting_date]. Do not use double brackets [[]] or other "
                    "formats for placeholders."
                ),
            },
            {"role": "user", "content": user_content},
        ]

        try:
            # Use OpenRouter client for the request
            response = await self.client.chat_completion(
                session_id=session_id,
                purpose="email_generation",
                messages=messages,
                model="openai/gpt-4o-mini",
                max_tokens=1000,
                temperature=0.4,
            )

            # Extract content using client method
            generated_content = self.client.extract_content(response)
            print(f"Generate content from email: {generated_content}")

            if not generated_content:
                return {
                    "error": "No content generated.",
                    "raw_response": response,
                    "session_id": session_id,
                }

            # Process the generated content
            processed_result = self._process_generated_content(generated_content)
            processed_result["session_id"] = session_id

            return processed_result

        except Exception as e:
            print(f"❌ Failed to generate email: {e}")
            return {
                "error": f"Email generation failed: {str(e)}",
                "session_id": session_id,
            }

    def _process_generated_content(self, content: str) -> Dict[str, Any]:
        """
        Process the generated content to extract subject and body with proper placeholder formatting.

        Args:
            content (str): Raw generated content from the AI

        Returns:
            Dict[str, Any]: Processed email with subject and body
        """
        # Process placeholders to ensure snake_case format
        pattern = re.compile(
            r"\[([^\[\]]+?)\]"
        )  # Matches [content] but not [[content]]

        def correct_placeholder_case(match):
            original_content = match.group(1).strip()
            # Clean the content for snake_case conversion
            cleaned_content = original_content
            if cleaned_content.lower().endswith("'s"):
                cleaned_content = cleaned_content[:-2]
            elif cleaned_content.lower().endswith("s'"):
                cleaned_content = cleaned_content[:-1]

            snake_case_name = self._to_snake_case(cleaned_content)
            return f"[{snake_case_name}]"

        processed_content = pattern.sub(correct_placeholder_case, content)

        # Extract subject and body
        lines = processed_content.split("\n")
        subject = ""
        body = []
        is_body = False

        for line in lines:
            if line.lower().startswith("subject:"):
                subject = line[len("subject:") :].strip()
                is_body = True
            elif line.lower().strip() == "":
                if is_body:
                    body.append(line)
            else:
                body.append(line)
                is_body = True

        # Handle cases where subject isn't properly identified
        if not subject and len(lines) > 1:
            subject = lines[0].strip()
            body = lines[1:]
        elif not subject and len(lines) == 1:
            subject = "Generated Email"
            body = lines
        elif subject and len(body) > 0 and body[0].lower().startswith("subject:"):
            body = body[1:]

        # Clean up the body
        cleaned_body = "\n\n".join([line.strip() for line in body if line.strip()])

        print(f"Generated - Subject: {subject}, Body: {cleaned_body}")

        return {"subject": subject, "body": cleaned_body}

    async def generate_email_with_fallback(
        self,
        tone: str,
        email_type: str,
        purpose: str,
        example: Optional[str] = None,
        session_id: Optional[str] = None,
        fallback_models: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Generate email with model fallback support.

        Args:
            tone (str): The desired tone of the email
            email_type (str): The type of email
            purpose (str): The main purpose or objective of the email
            example (Optional[str]): An optional example
            session_id (Optional[str]): Session ID for tracking
            fallback_models (Optional[list]): List of models to try in order

        Returns:
            Dict[str, Any]: Generated email or error message
        """
        if session_id is None:
            session_id = str(uuid.uuid4())

        # Default fallback models
        if fallback_models is None:
            fallback_models = [
                "openai/gpt-4o-mini",
                "anthropic/claude-3-haiku",
                "google/gemini-flash-1.5",
            ]

        # Build messages
        user_content_parts = [
            f"Generate an email with the following characteristics:\n",
            f"Tone: {tone}\n",
            f"Type: {email_type}\n",
            f"Purpose: {purpose}\n",
        ]

        if example:
            user_content_parts.append(f"Example: {example}\n")

        user_content_parts.append(
            f"Please provide only the subject and the body of the email. "
            f"Ensure all dynamic placeholders are in the [snake_case] format."
        )

        user_content = "".join(user_content_parts)

        messages = [
            {
                "role": "system",
                "content": (
                    "You are an AI assistant that generates emails. For all dynamic placeholders, "
                    "strictly use the format [snake_case_placeholder]. For example, use [recipient_name], "
                    "[your_company_name], [meeting_date]. Do not use double brackets [[]] or other "
                    "formats for placeholders."
                ),
            },
            {"role": "user", "content": user_content},
        ]

        try:
            # Use client's retry mechanism with fallback models
            response = await self.client.chat_completion_with_retries(
                session_id=session_id,
                purpose="email_generation_fallback",
                messages=messages,
                model_fallbacks=fallback_models,
                max_tokens=1000,
                temperature=0.4,
            )

            if not response:
                return {
                    "error": "All models failed to generate email",
                    "session_id": session_id,
                }

            # Extract and process content
            generated_content = self.client.extract_content(response)

            if not generated_content:
                return {
                    "error": "No content generated.",
                    "raw_response": response,
                    "session_id": session_id,
                }

            processed_result = self._process_generated_content(generated_content)
            processed_result["session_id"] = session_id
            processed_result["model_used"] = response.get("model")

            return processed_result

        except Exception as e:
            print(f"❌ Failed to generate email with fallback: {e}")
            return {
                "error": f"Email generation failed: {str(e)}",
                "session_id": session_id,
            }

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics from the OpenRouter client.

        Returns:
            Dict[str, Any]: Client statistics
        """
        return self.client.get_stats()
