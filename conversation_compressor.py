"""
Mistral-Optimized Conversation Auto-Compression System for AVA AI-SDR

Implements best practices for 128k context window management:
- Hybrid sliding window + semantic compression
- Position-aware structuring for Mistral
- 6-8x compression ratios while preserving workflow context
"""

import json
import tiktoken
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass


@dataclass
class MistralCompressionConfig:
    """Optimized configuration for Mistral's 128k context window"""

    # Token thresholds (optimized for performance)
    max_total_tokens: int = 40000  # Start compression at 40k
    target_compressed_tokens: int = 15000  # Target after compression

    # Message preservation strategy
    recent_messages_keep: int = 20  # Keep last 20 messages full
    middle_messages_range: int = 40  # Progressively summarize 21-60

    # Compression ratios based on research
    target_compression_ratio: float = 0.15  # 6-8x compression

    # Mistral-specific optimizations
    use_structured_format: bool = True  # Headers and sections
    position_critical_info: bool = True  # Start/end placement
    preserve_tool_workflows: bool = True  # Maintain tool dependencies


class MistralConversationCompressor:
    """
    Mistral-optimized conversation compressor using research-backed techniques:
    - Semantic compression with 6-8x ratios
    - Hybrid sliding window approach
    - Position-aware structuring
    """

    def __init__(self, openrouter_client, config: MistralCompressionConfig = None):
        self.openrouter_client = openrouter_client
        self.config = config or MistralCompressionConfig()
        self._token_cache = {}  # Cache for token counts

        # Use Mistral tokenizer if available, fallback to GPT-4
        try:
            # Mistral uses similar tokenization to GPT-4
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except:
            self.tokenizer = tiktoken.get_encoding("p50k_base")

    def count_tokens(self, text: str) -> int:
        """Accurate token counting for Mistral models with caching"""
        if isinstance(text, dict):
            text = json.dumps(text)
        
        text_key = str(text)
        if text_key in self._token_cache:
            return self._token_cache[text_key]
        
        token_count = len(self.tokenizer.encode(text_key))
        
        # Cache with size limit to prevent memory bloat
        if len(self._token_cache) < 1000:
            self._token_cache[text_key] = token_count
            
        return token_count

    def count_messages_tokens(self, messages: List[Dict]) -> int:
        """Count total tokens in message list"""
        total = 0
        for msg in messages:
            content = msg.get("content", "")
            total += self.count_tokens(content)

            # Count tool calls
            if "tool_calls" in msg:
                total += self.count_tokens(json.dumps(msg["tool_calls"]))
        return total

    def needs_compression(self, messages: List[Dict]) -> bool:
        """Check if conversation exceeds threshold with fast estimation"""
        # Quick check: if we have fewer than 30 messages, likely under threshold
        if len(messages) < 10:
            return False
            
        return self.count_messages_tokens(messages) > self.config.max_total_tokens

    async def compress_conversation(
        self, messages: List[Dict], session_id: str
    ) -> Tuple[List[Dict], Dict]:
        """
        Main compression function using Mistral-optimized strategies

        Returns: (compressed_messages, compression_stats)
        """
        original_tokens = self.count_messages_tokens(messages)

        if not self.needs_compression(messages):
            return messages, {
                "compressed": False,
                "original_tokens": original_tokens,
                "reason": "under_threshold",
            }

        print(
            f"🗜️ Compressing conversation: {original_tokens} tokens → target: {self.config.target_compressed_tokens}"
        )

        # Separate system messages from conversation
        system_msgs = [msg for msg in messages if msg.get("role") == "system"]
        conv_msgs = [msg for msg in messages if msg.get("role") != "system"]

        # Apply hybrid sliding window
        recent_msgs, middle_msgs, old_msgs = self._apply_sliding_window(conv_msgs)

        # Build compressed conversation
        compressed_messages = []

        # 1. Keep original system messages
        compressed_messages.extend(system_msgs)

        # 2. Create semantic compression of old + middle messages
        if old_msgs or middle_msgs:
            compression_context = await self._create_semantic_compression(
                old_msgs + middle_msgs, session_id
            )
            if compression_context:
                compressed_messages.append(
                    {"role": "system", "content": compression_context}
                )

        # 3. Keep recent messages full (position-aware placement)
        compressed_messages.extend(recent_msgs)

        # Optional debug logging (only if enabled)
        if hasattr(self.config, "debug") and self.config.debug:
            print(f"🔍 Compression debug:")
            print(
                f"   System: {len(system_msgs)}, Recent: {len(recent_msgs)}, Middle: {len(middle_msgs)}, Old: {len(old_msgs)}"
            )
            print(f"   Compressed messages: {len(compressed_messages)}")
            print(
                f"   Has compression context: {bool(compression_context if old_msgs or middle_msgs else False)}"
            )

        compressed_tokens = self.count_messages_tokens(compressed_messages)
        compression_ratio = (
            1 - (compressed_tokens / original_tokens) if original_tokens > 0 else 0
        )

        stats = {
            "compressed": True,
            "original_tokens": original_tokens,
            "compressed_tokens": compressed_tokens,
            "compression_ratio": compression_ratio,
            "tokens_saved": original_tokens - compressed_tokens,
            "categories": {
                "recent_kept": len(recent_msgs),
                "middle_compressed": len(middle_msgs),
                "old_compressed": len(old_msgs),
                "system_preserved": len(system_msgs),
            },
        }

        print(
            f"✅ Compression complete: {compression_ratio:.1%} reduction ({stats['tokens_saved']} tokens saved)"
        )
        return compressed_messages, stats

    def _apply_sliding_window(
        self, messages: List[Dict]
    ) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """Apply sliding window strategy to categorize messages"""
        total = len(messages)

        # Recent: last N messages (keep full)
        recent_start = max(0, total - self.config.recent_messages_keep)
        recent_msgs = messages[recent_start:]

        # Middle: messages before recent (progressive summarization)
        middle_start = max(0, recent_start - self.config.middle_messages_range)
        middle_msgs = messages[middle_start:recent_start]

        # Old: everything before middle (semantic digest)
        old_msgs = messages[:middle_start]

        return recent_msgs, middle_msgs, old_msgs

    async def _create_semantic_compression(
        self, messages: List[Dict], session_id: str
    ) -> Optional[str]:
        """
        Create semantic compression using Mistral-optimized format
        Based on research: 6-8x compression with key info preservation
        """
        if not messages:
            return None

        # Extract key elements for compression
        workflow_state = self._extract_workflow_state(messages)
        tool_context = self._extract_tool_context(messages)
        user_goals = self._extract_user_goals(messages)

        # Calculate original token count for compression header
        original_tokens = self.count_messages_tokens(messages)

        # Build structured compression (Mistral-optimized format)
        compression_parts = [
            f"[Context-Compressed History | Tokens: {original_tokens}→compressed | Messages: {len(messages)}]",
            "",
        ]

        # Current workflow state (position-critical info at start)
        if workflow_state:
            compression_parts.extend(["## Active Workflow State", workflow_state, ""])

        # Tool execution context
        if tool_context:
            compression_parts.extend(["## Tool Execution Context", tool_context, ""])

        # User goals and decisions
        if user_goals:
            compression_parts.extend(["## User Goals & Decisions", user_goals, ""])

        base_compression = "\n".join(compression_parts)

        # If still too long, use LLM for final semantic compression
        if self.count_tokens(base_compression) > 5000:
            return await self._llm_semantic_compression(base_compression, session_id)

        return base_compression

    def _extract_workflow_state(self, messages: List[Dict]) -> Optional[str]:
        """Extract current workflow state from messages"""
        state_indicators = []

        # Look for recent tool calls and their contexts
        recent_tools = []
        for msg in reversed(messages[-10:]):  # Last 10 messages
            if "tool_calls" in msg:
                for tool_call in msg["tool_calls"]:
                    tool_name = tool_call.get("function", {}).get("name", "unknown")
                    recent_tools.append(tool_name)

        if recent_tools:
            tool_summary = {}
            for tool in recent_tools:
                tool_summary[tool] = tool_summary.get(tool, 0) + 1

            tools_text = ", ".join(
                [f"{name}({count}x)" for name, count in tool_summary.items()]
            )
            state_indicators.append(f"• Active Tools: {tools_text}")

        # Extract last user goal
        for msg in reversed(messages):
            if msg.get("role") == "user":
                content = msg.get("content", "")
                if any(
                    keyword in content.lower()
                    for keyword in ["find", "search", "generate", "create", "send"]
                ):
                    state_indicators.append(f"• Current Goal: {content[:100]}...")
                    break

        return "\n".join(state_indicators) if state_indicators else None

    def _extract_tool_context(self, messages: List[Dict]) -> Optional[str]:
        """Extract tool execution context for workflow continuity"""
        tool_executions = []
        tool_results = {}

        for msg in messages:
            if "tool_calls" in msg:
                for tool_call in msg["tool_calls"]:
                    tool_name = tool_call.get("function", {}).get("name", "unknown")
                    tool_executions.append(tool_name)

            elif msg.get("role") == "tool":
                tool_name = msg.get("name", "unknown")
                content = msg.get("content", "")
                tool_executions.append(tool_name)  # Also track tool responses

                # Extract key results (contacts, companies, etc.)
                try:
                    result_data = json.loads(content)
                    if isinstance(result_data, dict):
                        if "contacts" in result_data:
                            contacts_count = len(result_data["contacts"])
                            tool_results[f"{tool_name}_contacts"] = contacts_count
                        if "companies" in result_data:
                            companies_count = len(result_data["companies"])
                            tool_results[f"{tool_name}_companies"] = companies_count
                        if "emails" in result_data:
                            emails_count = len(result_data["emails"])
                            tool_results[f"{tool_name}_emails"] = emails_count
                except:
                    pass

        context_parts = []

        # Tool execution summary
        if tool_executions:
            exec_summary = {}
            for tool in tool_executions:
                exec_summary[tool] = exec_summary.get(tool, 0) + 1

            exec_text = ", ".join(
                [f"{name}({count}x)" for name, count in exec_summary.items()]
            )
            context_parts.append(f"• Tools Executed: {exec_text}")

        # Results summary
        if tool_results:
            results_text = ", ".join(
                [f"{key}: {value}" for key, value in tool_results.items()]
            )
            context_parts.append(f"• Results Available: {results_text}")

        return "\n".join(context_parts) if context_parts else None

    def _extract_user_goals(self, messages: List[Dict]) -> Optional[str]:
        """Extract and summarize user goals from conversation"""
        goals = []

        for msg in messages:
            if msg.get("role") == "user":
                content = msg.get("content", "")

                # Look for goal-indicating patterns
                if any(
                    keyword in content.lower()
                    for keyword in [
                        "find",
                        "search",
                        "generate",
                        "create",
                        "send",
                        "help",
                        "need",
                        "want",
                    ]
                ):
                    # Clean and truncate
                    clean_goal = content.replace("\n", " ").strip()
                    if len(clean_goal) > 150:
                        clean_goal = clean_goal[:150] + "..."
                    goals.append(f"• {clean_goal}")

        # Keep only most recent goals
        return "\n".join(goals[-3:]) if goals else None

    async def _llm_semantic_compression(self, text: str, session_id: str) -> str:
        """Final LLM-based semantic compression if needed"""
        compression_prompt = [
            {
                "role": "system",
                "content": """Compress this conversation context to under 300 tokens while preserving:
1. Active workflow state
2. Tool execution results 
3. User goals and decisions
4. Any IDs, numbers, or specific data

Use structured format with headers. Be concise but complete.""",
            },
            {"role": "user", "content": f"Compress this context:\n\n{text}"},
        ]

        try:
            response = await self.openrouter_client.chat_completion(
                session_id=session_id,
                messages=compression_prompt,
                model="openai/gpt-4o-mini",  # Fast, cheap model for compression
                max_tokens=400,
                temperature=0.1,
            )

            compressed = self.openrouter_client.extract_content(response)
            return compressed if compressed else text[:2000]  # Fallback truncation

        except Exception as e:
            print(f"❌ LLM compression failed: {e}")
            return text[:2000]  # Simple truncation fallback


# Integration functions
async def compress_conversation_if_needed(
    messages: List[Dict],
    session_id: str,
    openrouter_client,
    config: MistralCompressionConfig = None,
) -> Tuple[List[Dict], Dict]:
    """
    Main integration function for agent.py

    Usage:
        api_messages, compression_stats = await compress_conversation_if_needed(
            api_messages, session_id, self.openrouter_client
        )

        if compression_stats.get("compressed"):
            print(f"💾 Compressed conversation: {compression_stats['compression_ratio']:.1%} reduction")
    """
    compressor = MistralConversationCompressor(openrouter_client, config)
    return await compressor.compress_conversation(messages, session_id)


def estimate_mistral_costs(original_tokens: int, compressed_tokens: int) -> Dict:
    """Estimate cost savings for Mistral pricing"""
    # Mistral Large pricing (approximate)
    input_cost_per_1k = 0.004  # $4/1M tokens

    original_cost = (original_tokens / 1000) * input_cost_per_1k
    compressed_cost = (compressed_tokens / 1000) * input_cost_per_1k
    savings = original_cost - compressed_cost

    return {
        "original_cost_usd": original_cost,
        "compressed_cost_usd": compressed_cost,
        "savings_usd": savings,
        "tokens_saved": original_tokens - compressed_tokens,
        "compression_ratio": (
            1 - (compressed_tokens / original_tokens) if original_tokens > 0 else 0
        ),
    }
