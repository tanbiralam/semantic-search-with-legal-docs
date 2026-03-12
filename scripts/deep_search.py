"""
deep_search.py - Runtime deep search using NVIDIA API (meta/llama-3.1-70b-instruct)
               + local tree JSON files.

Called by the Next.js API route via child_process.spawn().
Reads a JSON query from stdin, streams NDJSON response chunks to stdout.

Input (stdin JSON):
    { "query": "What are the limits on police searches?", "doc_ids": ["nvidia-marbury_vs_madison", ...] }

    OR (legacy / direct tree path mode):
    { "query": "...", "trees": ["docs/trees/marbury_vs_madison_tree.json", ...], "docs_dir": "docs/" }

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

import requests
from dotenv import load_dotenv

# Load .env from project root (two levels up from this script)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

TREES_DIR_DEFAULT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "docs", "trees"
)
DB_PATH_DEFAULT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "docs", "db.json"
)

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_MODEL = (
    os.environ.get("NVIDIA_DEEP_SEARCH_MODEL", "").strip()
    or "meta/llama-3.1-70b-instruct"
)


def emit(data: dict):
    """Write a JSON line to stdout and flush immediately."""
    print(json.dumps(data, ensure_ascii=False), flush=True)


# ── Tree loading ──────────────────────────────────────────────────────────────

def load_all_trees(trees_dir: str) -> list[dict]:
    """Load every tree JSON file found in the trees directory."""
    trees = []
    if not os.path.isdir(trees_dir):
        return trees
    for fname in sorted(os.listdir(trees_dir)):
        if fname.endswith("_tree.json"):
            path = os.path.join(trees_dir, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    trees.append(json.load(f))
            except Exception:
                pass
    return trees


def load_trees_by_doc_ids(trees_dir: str, doc_ids: list[str]) -> list[dict]:
    """Load only the tree files that correspond to the given doc_ids."""
    all_trees = load_all_trees(trees_dir)
    if not doc_ids:
        return all_trees
    result = []
    for t in all_trees:
        if t.get("doc_id") in doc_ids:
            result.append(t)
    # If none matched (e.g. IDs mismatch), fall back to all trees
    return result if result else all_trees


def gather_relevant_sections(trees: list[dict], max_chars: int = 60000) -> tuple[str, list[dict]]:
    """
    Flatten all trees into a single context string suitable for the LLM.
    Returns (context_string, list_of_source_metadata).
    """
    sections: list[tuple[str, str, int, str]] = []  # (title, node_text, page_index, case_title)

    for tree in trees:
        case_title = tree.get("title", "Unknown Case")
        for root_node in tree.get("tree", []):
            # Root node itself
            sections.append((
                root_node.get("title", case_title),
                root_node.get("text", ""),
                root_node.get("page_index", 1),
                case_title,
            ))
            # Child nodes
            for node in root_node.get("nodes", []):
                sections.append((
                    node.get("title", ""),
                    node.get("text", ""),
                    node.get("page_index", 1),
                    case_title,
                ))

    # Build context string, respecting max_chars
    context_parts = []
    total = 0
    sources_meta = []

    for sec_title, sec_text, page_idx, case_title in sections:
        if not sec_text.strip():
            continue
        block = f"\n\n--- CASE: {case_title} | SECTION: {sec_title} (page {page_idx}) ---\n{sec_text.strip()}"
        if total + len(block) > max_chars:
            break
        context_parts.append(block)
        total += len(block)
        sources_meta.append({
            "case": case_title,
            "section": sec_title,
            "page": page_idx,
        })

    return "".join(context_parts), sources_meta


# ── NVIDIA streaming ─────────────────────────────────────────────────────────

def run_nvidia_deep_search(query: str, context: str, sources_meta: list[dict]):
    """Stream NVIDIA API answer chunks to stdout as NDJSON."""

    api_key = os.environ.get("NVIDIA_API_KEY")
    if not api_key:
        emit({"type": "error", "message": "NVIDIA_API_KEY environment variable is not set."})
        return

    system_prompt = (
        "You are a senior legal research assistant specializing in U.S. Supreme Court jurisprudence. "
        "You have been given excerpts from landmark Supreme Court cases. "
        "Answer the user's question thoroughly, citing specific cases and page numbers from the provided context. "
        "Structure your answer with clear headings. End with a 'Key Sources' section listing the cases cited."
    )

    user_prompt = f"""LEGAL DOCUMENT EXCERPTS:
{context}

---

USER QUESTION: {query}

Please provide a comprehensive, well-cited answer based on the documents above."""

    emit({"type": "source", "tool_name": "search_tree", "status": "started"})
    emit({"type": "source", "tool_name": "search_tree", "status": "result"})

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }

    payload = {
        "model": NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 4096,
        "temperature": 0.3,
        "top_p": 0.95,
        "stream": True,
        "chat_template_kwargs": {"enable_thinking": False},
    }

    try:
        response = requests.post(
            NVIDIA_API_URL, headers=headers, json=payload, stream=True, timeout=120
        )
        response.raise_for_status()

        for line in response.iter_lines():
            if not line:
                continue
            decoded = line.decode("utf-8")
            # SSE format: "data: {...}"
            if decoded.startswith("data: "):
                data_str = decoded[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    text = delta.get("content", "")
                    if text:
                        emit({"type": "content", "text": text})
                except (json.JSONDecodeError, IndexError, KeyError):
                    pass

        emit({"type": "done"})

    except Exception as e:
        emit({"type": "error", "message": f"NVIDIA streaming failed: {str(e)}"})


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    # Read input from stdin
    try:
        raw_input = sys.stdin.read()
        input_data = json.loads(raw_input)
    except (json.JSONDecodeError, Exception) as e:
        emit({"type": "error", "message": f"Invalid input: {str(e)}"})
        return

    query = input_data.get("query", "").strip()
    doc_ids = input_data.get("doc_ids", [])

    # Support legacy tree-path mode too
    tree_paths = input_data.get("trees", [])
    docs_dir_override = input_data.get("docs_dir", "")

    if not query:
        emit({"type": "error", "message": "Query is required"})
        return

    emit({"type": "status", "message": "Analyzing legal documents with AI reasoning..."})

    # Determine trees directory
    trees_dir = TREES_DIR_DEFAULT
    if docs_dir_override:
        trees_dir = os.path.join(docs_dir_override, "trees")

    # Load tree files
    if tree_paths:
        # Legacy mode: explicit file paths
        trees = []
        for tp in tree_paths:
            try:
                with open(tp, "r", encoding="utf-8") as f:
                    trees.append(json.load(f))
            except Exception:
                pass
    else:
        trees = load_trees_by_doc_ids(trees_dir, doc_ids)

    if not trees:
        emit({
            "type": "error",
            "message": (
                "No tree files found. Please run:\n"
                "  python scripts/generate_trees.py\n"
                "to generate the tree index files first."
            ),
        })
        return

    emit({
        "type": "status",
        "message": f"Loaded {len(trees)} case documents. Reasoning with NVIDIA Llama 3.1 70B...",
    })

    # Build context from trees
    context, sources_meta = gather_relevant_sections(trees)

    if not context.strip():
        emit({"type": "error", "message": "No text content found in tree files."})
        return

    # Stream answer via NVIDIA API
    run_nvidia_deep_search(query, context, sources_meta)


if __name__ == "__main__":
    main()
