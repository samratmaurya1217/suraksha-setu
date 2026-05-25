"""
Function Call Executor
Safely validates and executes LLM tool_calls against a whitelist.
"""
import json
import logging
from typing import Dict, Any, List

from ai.tools import TOOL_EXECUTORS

logger = logging.getLogger(__name__)

# Security whitelist
APPROVED_FUNCTIONS = set(TOOL_EXECUTORS.keys())


async def execute_tool_calls(tool_calls: List[Dict]) -> List[Dict[str, Any]]:
    """
    Execute a list of tool_calls returned by OpenAI.

    Each item: {"id": str, "function": {"name": str, "arguments": str(json)}}
    Returns a list of {tool_call_id, role, content} ready to feed back to the model.
    """
    results: List[Dict[str, Any]] = []

    for tc in tool_calls:
        fn_name = tc["function"]["name"]
        raw_args = tc["function"]["arguments"]

        if fn_name not in APPROVED_FUNCTIONS:
            logger.warning(f"🚫 Blocked unapproved function: {fn_name}")
            results.append({
                "tool_call_id": tc["id"],
                "role": "tool",
                "content": json.dumps({"error": f"Function '{fn_name}' not allowed"}),
            })
            continue

        try:
            args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
        except json.JSONDecodeError:
            results.append({
                "tool_call_id": tc["id"],
                "role": "tool",
                "content": json.dumps({"error": "Invalid JSON arguments"}),
            })
            continue

        try:
            executor = TOOL_EXECUTORS[fn_name]
            result = await executor(**args)
            results.append({
                "tool_call_id": tc["id"],
                "role": "tool",
                "content": json.dumps(result, default=str),
            })
            logger.info(f"✅ Executed tool: {fn_name}")
        except Exception as e:
            logger.error(f"❌ Tool execution error ({fn_name}): {e}")
            results.append({
                "tool_call_id": tc["id"],
                "role": "tool",
                "content": json.dumps({"error": str(e)}),
            })

    return results
