"""
deep_search.py - Runtime deep search using PageIndex Chat API with streaming.

Called by the Next.js API route via child_process.spawn().
Reads a JSON query from stdin, streams NDJSON response chunks to stdout.

Input (stdin JSON):
    { "query": "What are the limits on police searches?", "doc_ids": ["pi-abc123", ...] }

Output (stdout NDJSON - one JSON object per line):
    { "type": "status", "message": "Searching documents..." }
    { "type": "content", "text": "Based on the legal precedents..." }
    { "type": "content", "text": " the Fourth Amendment..." }
    { "type": "source", "tool_name": "search_tree", "status": "started" }
    { "type": "source", "tool_name": "search_tree", "status": "result" }
    { "type": "done" }
    { "type": "error", "message": "Something went wrong" }
"""

import json
import os
import sys

from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))


def emit(data: dict):
    """Write a JSON line to stdout and flush immediately."""
    print(json.dumps(data, ensure_ascii=False), flush=True)


def main():
    # Read input from stdin
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
    except (json.JSONDecodeError, Exception) as e:
        emit({"type": "error", "message": f"Invalid input: {str(e)}"})
        return

    query = input_data.get("query", "")
    doc_ids = input_data.get("doc_ids", [])

    if not query:
        emit({"type": "error", "message": "Query is required"})
        return

    if not doc_ids:
        emit({"type": "error", "message": "No document IDs provided. Run generate_trees.py first."})
        return

    # Validate API key
    api_key = os.environ.get("PAGEINDEX_API_KEY")
    if not api_key:
        emit({"type": "error", "message": "PAGEINDEX_API_KEY environment variable is not set."})
        return

    try:
        from pageindex import PageIndexClient

        client = PageIndexClient(api_key=api_key)

        emit({"type": "status", "message": "Analyzing legal documents with AI reasoning..."})

        # Use PageIndex Chat API with streaming and metadata
        # Pass all doc_ids for cross-document reasoning
        doc_id_param = doc_ids if len(doc_ids) > 1 else doc_ids[0]

        for chunk in client.chat_completions(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a legal research assistant specialized in U.S. Supreme Court cases. "
                        "When answering questions, provide thorough analysis with specific citations "
                        "to the relevant cases. Include the case name, year, and key holdings. "
                        "Format your response in clear sections. At the end of your response, "
                        "list the specific cases you cited as sources."
                    ),
                },
                {"role": "user", "content": query},
            ],
            doc_id=doc_id_param,
            stream=True,
            stream_metadata=True,
        ):
            # Handle metadata blocks (tool calls, search progress)
            metadata = chunk.get("block_metadata", {}) if isinstance(chunk, dict) else {}
            if metadata:
                block_type = metadata.get("type", "")
                if block_type == "mcp_tool_use_start":
                    tool_name = metadata.get("tool_name", "search")
                    emit({"type": "source", "tool_name": tool_name, "status": "started"})
                elif block_type == "mcp_tool_result_start":
                    emit({"type": "source", "tool_name": "", "status": "result"})

            # Handle content
            if isinstance(chunk, dict):
                choices = chunk.get("choices", [{}])
                if choices:
                    content = choices[0].get("delta", {}).get("content", "")
                    if content:
                        emit({"type": "content", "text": content})
            elif isinstance(chunk, str) and chunk:
                emit({"type": "content", "text": chunk})

        emit({"type": "done"})

    except ImportError:
        emit({"type": "error", "message": "pageindex package not installed. Run: pip install pageindex"})
    except Exception as e:
        emit({"type": "error", "message": f"Deep search failed: {str(e)}"})


if __name__ == "__main__":
    main()
