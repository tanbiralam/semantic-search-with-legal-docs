"""
generate_trees.py - Pre-generate PageIndex tree structures for all legal PDFs.

Usage:
    1. Activate your Python virtual environment
    2. pip install -r requirements.txt
    3. Set PAGEINDEX_API_KEY environment variable
    4. python scripts/generate_trees.py

This script:
    - Reads docs/db.json for the list of documents
    - Submits each PDF to the PageIndex API for tree generation
    - Polls for completion
    - Saves the tree JSON + doc_id mapping to docs/trees/
"""

import json
import os
import sys
import time

from dotenv import load_dotenv
from pageindex import PageIndexClient

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"))


def load_documents(db_path: str) -> list[dict]:
    """Load document list from db.json."""
    with open(db_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("documents", [])


def get_tree_filename(pdf_filename: str) -> str:
    """Convert PDF filename to tree JSON filename."""
    return pdf_filename.replace(".pdf", "_tree.json")


def submit_and_wait(client: PageIndexClient, pdf_path: str, max_wait: int = 300) -> dict | None:
    """Submit a PDF and poll until tree generation completes."""
    print(f"  Submitting: {pdf_path}")
    result = client.submit_document(pdf_path)
    doc_id = result["doc_id"]
    print(f"  Got doc_id: {doc_id}")

    # Poll for completion
    elapsed = 0
    poll_interval = 5
    while elapsed < max_wait:
        tree_result = client.get_tree(doc_id)
        status = tree_result.get("status", "unknown")

        if status == "completed":
            print(f"  ✅ Tree generation completed for {pdf_path}")
            return {
                "doc_id": doc_id,
                "status": "completed",
                "tree": tree_result.get("result", []),
            }
        elif status == "failed":
            print(f"  ❌ Tree generation failed for {pdf_path}")
            return None

        print(f"  ⏳ Status: {status} (waiting {poll_interval}s...)")
        time.sleep(poll_interval)
        elapsed += poll_interval

    print(f"  ⏰ Timeout waiting for {pdf_path}")
    return None


def main():
    # Resolve paths relative to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    docs_dir = os.path.join(project_root, "docs")
    db_path = os.path.join(docs_dir, "db.json")
    trees_dir = os.path.join(docs_dir, "trees")

    api_key = os.environ.get("PAGEINDEX_API_KEY")
    if not api_key:
        print("❌ Error: PAGEINDEX_API_KEY environment variable is not set.")
        print("   Get your API key from https://pageindex.ai")
        sys.exit(1)

    os.makedirs(trees_dir, exist_ok=True)

    documents = load_documents(db_path)
    print(f"📚 Found {len(documents)} documents in db.json\n")

    client = PageIndexClient(api_key=api_key)

    doc_id_mapping = {}
    success_count = 0
    fail_count = 0

    for i, doc in enumerate(documents, 1):
        filename = doc["filename"]
        pdf_path = os.path.join(docs_dir, filename)
        tree_filename = get_tree_filename(filename)
        tree_path = os.path.join(trees_dir, tree_filename)

        print(f"[{i}/{len(documents)}] Processing: {doc['title']}")

        if os.path.exists(tree_path):
            print(f"  ⏭️  Tree already exists, skipping. Delete {tree_path} to regenerate.")
            with open(tree_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                doc_id_mapping[filename] = existing.get("doc_id", "")
            success_count += 1
            continue

        if not os.path.exists(pdf_path):
            print(f"  ❌ PDF not found: {pdf_path}")
            fail_count += 1
            continue

        result = submit_and_wait(client, pdf_path)

        if result:
            tree_data = {
                "doc_id": result["doc_id"],
                "filename": filename,
                "title": doc["title"],
                "tree": result["tree"],
            }
            with open(tree_path, "w", encoding="utf-8") as f:
                json.dump(tree_data, f, indent=2, ensure_ascii=False)

            doc_id_mapping[filename] = result["doc_id"]
            success_count += 1
            print(f"  💾 Saved tree to {tree_path}\n")
        else:
            fail_count += 1
            print()

    mapping_path = os.path.join(trees_dir, "_doc_id_mapping.json")
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(doc_id_mapping, f, indent=2)

    print(f"\n{'='*50}")
    print(f"✅ Completed: {success_count} succeeded, {fail_count} failed")
    print(f"📁 Trees saved to: {trees_dir}")
    print(f"📋 Doc ID mapping: {mapping_path}")

    for doc in documents:
        tree_filename = get_tree_filename(doc["filename"])
        tree_path_relative = f"trees/{tree_filename}"
        doc["treeFile"] = tree_path_relative

    with open(db_path, "w", encoding="utf-8") as f:
        json.dump({"documents": documents}, f, indent=2, ensure_ascii=False)
    print(f"📝 Updated db.json with treeFile paths")


if __name__ == "__main__":
    main()
