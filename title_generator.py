from typing import List
from LLM.open_router_client import OpenRouterClient, ResponseFormat


class TitleGenerator:
    """
    A service to generate a title for a chat session using an LLM.
    """

    def __init__(self, llm_client: OpenRouterClient):
        """
        Initializes the TitleGenerator with an OpenRouterClient.

        Args:
            llm_client: An instance of OpenRouterClient.
        """
        self.llm_client = llm_client

    async def generate_title(self, session_id: str, messages: List[str]) -> str:
        """
        Generates a concise and relevant title from a list of user messages by calling an LLM.

        This is an async method that awaits the LLM API call.
        """
        print("🤖 Starting title generation with LLM...")

        # 1. Create a prompt for the LLM
        conversation_summary = "\n".join(f"- {msg}" for msg in messages)
        prompt_messages = [
            {
                "role": "system",
                "content": "You are an expert at creating short, concise, and informative titles for conversations. Based on the following messages, generate a title that is no more than 5-7 words long.",
            },
            {
                "role": "user",
                "content": f"Here is the conversation so far:\n{conversation_summary}",
            },
        ]

        # 2. Call the LLM using the OpenRouterClient
        response = await self.llm_client.chat_completion_with_retries(
            session_id=session_id,
            messages=prompt_messages,
            purpose="title_generation",
            # Using a fast and capable model for titling
            model_fallbacks=[
                "cohere/command-r-08-2024",
                "mistralai/mistral-7b-instruct",
                "openai/gpt-3.5-turbo",
            ],
            temperature=0.5,
            max_tokens=30,  # Titles are short
        )

        if not response:
            print("❌ LLM call failed after all retries. Returning a default title.")
            return "Chat in progress"

        # 3. Extract the content from the response
        title = self.llm_client.extract_content(response)

        # Clean up the title (e.g., remove quotes)
        cleaned_title = title.strip().replace('"', "")

        print(f"✅ LLM-generated title: '{cleaned_title}'")
        return cleaned_title if cleaned_title else "Chat Summary"
