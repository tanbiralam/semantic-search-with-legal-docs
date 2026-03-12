"""
generate_trees.py - Pre-generate hierarchical tree structures for all legal PDFs
                    using NVIDIA Llama 3.1 70B with OpenAI fallback + PyMuPDF.

Uses a CHUNKED approach: splits large documents into ~8K character groups,
processes each chunk separately, then merges all sections into one tree.
This stays within NVIDIA's token limits even for 200+ page documents.

Usage:
    1. Activate your Python virtual environment
    2. pip install -r requirements.txt
    3. Set NVIDIA_API_KEY in .env
       Optional fallback: set OPENAI_API_KEY in .env
    4. python scripts/generate_trees.py
"""

import json
import os
import re
import sys
import time

import fitz  # PyMuPDF
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
NVIDIA_MODEL = os.environ.get("NVIDIA_TREE_MODEL", "").strip() or "meta/llama-3.1-70b-instruct"
OPENAI_MODEL = os.environ.get("OPENAI_TREE_MODEL", "").strip() or "gpt-4o-mini"
CHUNK_CHAR_LIMIT = 8000  # chars per chunk sent to the LLM
OVERLAP_PAGES = 1         # number of overlapping pages between chunks

# ── helpers ───────────────────────────────────────────────────────────────────


def load_documents(db_path: str) -> list[dict]:
    with open(db_path, "r", encoding="utf-8") as f:
        return json.load(f).get("documents", [])


def get_tree_filename(pdf_filename: str) -> str:
    return pdf_filename.replace(".pdf", "_tree.json")


def extract_pdf_text(pdf_path: str) -> tuple[str, list[tuple[int, str]]]:
    """
    Returns (full_text, page_texts) where page_texts is a list of
    (1-based page number, page text) tuples.
    """
    doc = fitz.open(pdf_path)
    pages: list[tuple[int, str]] = []
    all_parts: list[str] = []
    for i, page in enumerate(doc):
        text = page.get_text("text").strip()
        if text:
            pages.append((i + 1, text))
            all_parts.append(text)
    doc.close()
    return "\n\n".join(all_parts), pages


def build_node_id(index: int) -> str:
    return str(index).zfill(4)


def strip_json_fences(raw: str) -> str:
    """Remove optional markdown code fences around JSON output."""
    raw = re.sub(r"^```json\s*", "", raw.strip())
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


# ── chunk pages into groups ───────────────────────────────────────────────────


def chunk_pages(
    page_texts: list[tuple[int, str]],
    char_limit: int = CHUNK_CHAR_LIMIT,
    overlap: int = OVERLAP_PAGES,
) -> list[list[tuple[int, str]]]:
    """
    Split page_texts into groups where each group's total text is ≤ char_limit.
    Consecutive chunks share `overlap` pages for cross-boundary context.
    """
    chunks: list[list[tuple[int, str]]] = []
    current_chunk: list[tuple[int, str]] = []
    current_size = 0

    for page in page_texts:
        page_len = len(page[1])
        # If adding this page would exceed limit and chunk is non-empty, close it
        if current_size + page_len > char_limit and current_chunk:
            chunks.append(current_chunk)
            # Start new chunk with overlapping pages from the end of current
            overlap_pages = current_chunk[-overlap:] if overlap > 0 else []
            current_chunk = list(overlap_pages)
            current_size = sum(len(p[1]) for p in current_chunk)

        current_chunk.append(page)
        current_size += page_len

    # Don't forget the last chunk
    if current_chunk:
        chunks.append(current_chunk)

    return chunks


# ── provider setup ────────────────────────────────────────────────────────────


def get_llm_providers() -> list[dict]:
    """Build the ordered provider chain for tree generation."""
    providers: list[dict] = []

    nvidia_api_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    if nvidia_api_key:
        providers.append({
            "name": "nvidia",
            "label": f"NVIDIA ({NVIDIA_MODEL})",
            "api_url": NVIDIA_API_URL,
            "api_key": nvidia_api_key,
            "model": NVIDIA_MODEL,
            "timeout": 300,
            "extra_payload": {"chat_template_kwargs": {"enable_thinking": False}},
        })

    openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if openai_api_key:
        providers.append({
            "name": "openai",
            "label": f"OpenAI ({OPENAI_MODEL})",
            "api_url": OPENAI_API_URL,
            "api_key": openai_api_key,
            "model": OPENAI_MODEL,
            "timeout": 180,
            "extra_payload": {},
        })

    return providers


def call_chat_completion(provider: dict, system_prompt: str, user_prompt: str) -> str:
    """Call an OpenAI-compatible chat completions endpoint."""
    headers = {
        "Authorization": f"Bearer {provider['api_key']}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": provider["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 8192,
        "temperature": 0.2,
        "top_p": 0.95,
        "stream": False,
    }
    payload.update(provider.get("extra_payload", {}))

    response = requests.post(
        provider["api_url"],
        headers=headers,
        json=payload,
        timeout=provider["timeout"],
    )
    response.raise_for_status()
    data = response.json()

    return data["choices"][0]["message"]["content"]


# ── process one chunk ─────────────────────────────────────────────────────────


def process_chunk(
    providers: list[dict],
    doc_title: str,
    chunk_pages_list: list[tuple[int, str]],
    chunk_index: int,
    total_chunks: int,
    max_retries: int = 3,
) -> list[dict]:
    """
    Ask the configured provider chain to identify sections in one chunk of pages.
    Returns a list of section dicts: [{title, page_index, text}, ...]
    """
    labelled = "\n\n".join(
        f"[PAGE {pno}]\n{txt}" for pno, txt in chunk_pages_list
    )

    page_range = f"pages {chunk_pages_list[0][0]}–{chunk_pages_list[-1][0]}"

    system_prompt = (
        "You are a legal document analyzer. Your task is to divide legal case document "
        "excerpts into logical sections and return structured JSON. You must return ONLY "
        "valid JSON — no markdown fences, no explanations, no extra text."
    )

    user_prompt = f"""You are analyzing part {chunk_index}/{total_chunks} of the U.S. Supreme Court case: "{doc_title}" ({page_range}).

Below is a portion of the document, with each page labeled [PAGE N].

Your task: identify ALL logical sections in this excerpt. Typical sections include Syllabus, Facts, Majority Opinion, Concurrence, Dissent, specific legal questions, etc.

For EACH section return a JSON object with:
  - "title": a concise descriptive title (10 words max)
  - "page_index": the 1-based page number where this section begins
  - "text": the complete verbatim text of this section from the excerpt

Return ONLY a valid JSON array of these objects.

DOCUMENT EXCERPT:
{labelled}
"""

    for provider in providers:
        print(f"      🤖 Trying {provider['label']}...")

        for attempt in range(1, max_retries + 1):
            try:
                raw = call_chat_completion(provider, system_prompt, user_prompt)
                raw = strip_json_fences(raw)
                sections = json.loads(raw)
                if not isinstance(sections, list) or len(sections) == 0:
                    raise ValueError("Empty or invalid sections list")

                return [
                    {
                        "title": str(s.get("title", "Section")),
                        "page_index": int(s.get("page_index", chunk_pages_list[0][0])),
                        "text": str(s.get("text", "")),
                    }
                    for s in sections
                ]

            except (json.JSONDecodeError, ValueError, KeyError, TypeError) as e:
                print(
                    f"      ⚠️  {provider['label']} attempt {attempt}/{max_retries} parse error: {e}"
                )
                if attempt < max_retries:
                    time.sleep(5)
            except (
                requests.exceptions.HTTPError,
                requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError,
                requests.exceptions.Timeout,
                requests.exceptions.RequestException,
            ) as e:
                print(
                    f"      ⚠️  {provider['label']} attempt {attempt}/{max_retries} API error: {e}"
                )
                if attempt < max_retries:
                    wait = 15 * attempt
                    print(f"      ⏳ Waiting {wait}s before retry...")
                    time.sleep(wait)

        if provider != providers[-1]:
            print("      ↪️  Falling back to the next provider...")

    # Fallback: return raw pages as sections
    return [
        {
            "title": f"Page {pno}",
            "page_index": pno,
            "text": txt,
        }
        for pno, txt in chunk_pages_list
    ]


# ── merge & deduplicate sections ──────────────────────────────────────────────


def merge_sections(all_sections: list[dict]) -> list[dict]:
    """
    Merge sections from multiple chunks, removing duplicates caused by
    the overlap between chunks. Deduplicates by page_index + similar title.
    """
    seen: dict[int, dict] = {}  # page_index → section

    for sec in all_sections:
        page = sec["page_index"]
        if page not in seen:
            seen[page] = sec
        else:
            # Keep the one with more text (more complete)
            if len(sec.get("text", "")) > len(seen[page].get("text", "")):
                seen[page] = sec

    # Sort by page_index
    merged = sorted(seen.values(), key=lambda s: s["page_index"])
    return merged


# ── main tree generation ──────────────────────────────────────────────────────


def generate_tree_chunked(
    providers: list[dict],
    doc_title: str,
    full_text: str,
    page_texts: list[tuple[int, str]],
) -> list[dict]:
    """
    Chunked tree generation: splits pages into groups, processes each,
    merges the results into a single flat list of nodes.
    """
    chunks = chunk_pages(page_texts)
    total_chunks = len(chunks)

    print(f"  📦 Split into {total_chunks} chunks")

    all_sections: list[dict] = []

    for idx, chunk in enumerate(chunks, start=1):
        page_range = f"pages {chunk[0][0]}–{chunk[-1][0]}"
        print(f"    🔄 Processing chunk {idx}/{total_chunks} ({page_range})...")

        sections = process_chunk(providers, doc_title, chunk, idx, total_chunks)
        all_sections.extend(sections)
        print(f"    ✅ Got {len(sections)} sections from chunk {idx}")

        # Rate-limit between chunks
        if idx < total_chunks:
            time.sleep(3)

    # Merge and deduplicate
    merged = merge_sections(all_sections)
    print(f"  🔗 Merged into {len(merged)} unique sections")

    # Assign node IDs
    nodes: list[dict] = []
    for i, sec in enumerate(merged, start=1):
        nodes.append({
            "title": sec["title"],
            "node_id": build_node_id(i),
            "page_index": sec["page_index"],
            "text": sec["text"],
        })

    return nodes


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    docs_dir = os.path.join(project_root, "docs")
    db_path = os.path.join(docs_dir, "db.json")
    trees_dir = os.path.join(docs_dir, "trees")

    providers = get_llm_providers()
    if not providers:
        print("❌ Error: no LLM API keys found.")
        print("   Add NVIDIA_API_KEY and optionally OPENAI_API_KEY to your .env file.")
        sys.exit(1)

    os.makedirs(trees_dir, exist_ok=True)

    documents = load_documents(db_path)
    print(f"📚 Found {len(documents)} documents in db.json\n")
    print("🤖 Provider chain:", " -> ".join(provider["label"] for provider in providers))
    print("")

    success_count = 0
    fail_count = 0

    for i, doc in enumerate(documents, 1):
        filename = doc["filename"]
        title = doc.get("title", filename)
        pdf_path = os.path.join(docs_dir, filename)
        tree_filename = get_tree_filename(filename)
        tree_path = os.path.join(trees_dir, tree_filename)

        print(f"[{i}/{len(documents)}] {title}")

        # Skip already-generated trees
        if os.path.exists(tree_path):
            print(f"  ⏭️  Tree already exists — skipping. Delete {tree_path} to regenerate.\n")
            success_count += 1
            doc["treeFile"] = f"trees/{tree_filename}"
            continue

        if not os.path.exists(pdf_path):
            print(f"  ❌ PDF not found: {pdf_path}\n")
            fail_count += 1
            continue

        print(f"  📄 Extracting text from PDF...")
        try:
            full_text, page_texts = extract_pdf_text(pdf_path)
        except Exception as e:
            print(f"  ❌ Failed to read PDF: {e}\n")
            fail_count += 1
            continue

        if not page_texts:
            print(f"  ❌ No readable text found in {filename}\n")
            fail_count += 1
            continue

        print(f"  🤖 Generating tree ({len(page_texts)} pages)...")
        try:
            nodes = generate_tree_chunked(providers, title, full_text, page_texts)
        except Exception as e:
            print(f"  ❌ All providers failed: {e}\n")
            fail_count += 1
            continue

        # Build root node wrapping all section nodes (matches PageIndex format)
        tree_data = {
            "doc_id": f"nvidia-{filename.replace('.pdf', '')}",
            "filename": filename,
            "title": title,
            "tree": [
                {
                    "title": title,
                    "node_id": "0000",
                    "page_index": 1,
                    "text": full_text[:3000],  # synopsis / first chunk
                    "nodes": nodes,
                }
            ],
        }

        with open(tree_path, "w", encoding="utf-8") as f:
            json.dump(tree_data, f, indent=2, ensure_ascii=False)

        doc["treeFile"] = f"trees/{tree_filename}"
        success_count += 1
        print(f"  ✅ Saved {len(nodes)} sections → {tree_path}\n")

        # Rate-limit between documents
        if i < len(documents):
            time.sleep(5)

    # Update db.json with treeFile paths
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump({"documents": documents}, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*50}")
    print(f"✅ Completed: {success_count} succeeded, {fail_count} failed")
    print(f"📁 Trees saved to: {trees_dir}")
    print(f"📝 Updated db.json with treeFile paths")


if __name__ == "__main__":
    main()
