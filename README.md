# ⚖️ Legal Semantic Search

A Next.js application that enables **intelligent semantic search** across landmark U.S. Supreme Court case documents using AI-powered vector embeddings and similarity search.

> Ask questions in plain English like _"What are the limits on police searches?"_ and get back the most relevant case passages — no keyword matching required.

---

## 🚀 Features

- **Semantic Search** — Natural language queries powered by Voyage AI's legal-domain embeddings
- **Legal Document Processing** — Automated PDF ingestion, chunking, and vectorization via LangChain
- **Vector Database** — Efficient similarity search using Pinecone's serverless infrastructure
- **MMR Search** — Max Marginal Relevance ensures diverse, non-redundant results
- **Bluebook Citations** — Auto-generated legal citations with one-click copy
- **Document Viewer** — Full-screen modal with relevant quote highlighting and reading progress
- **Dark UI** — Responsive, modern dark-themed interface

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 14 (App Router)                  │
├──────────────────────────┬──────────────────────────────────────┤
│     React Frontend       │         API Routes (Server)          │
│                          │                                      │
│  ┌──────────────────┐    │   ┌────────────┐  ┌──────────────┐  │
│  │   SearchForm     │────┼──▶│ /api/search │  │/api/bootstrap│  │
│  │   SearchResults  │◀───┼───│            │  │  /api/ingest │  │
│  │   DocumentView   │    │   └─────┬──────┘  └──────┬───────┘  │
│  │   CitationGen    │    │         │                 │          │
│  └──────────────────┘    │         ▼                 ▼          │
│                          │   ┌──────────┐     ┌────────────┐   │
│                          │   │ Voyage AI│     │  LangChain │   │
│                          │   │voyage-law│     │ PDF Loader │   │
│                          │   └────┬─────┘     │  Splitter  │   │
│                          │        │           └─────┬──────┘   │
│                          │        ▼                 ▼          │
│                          │   ┌──────────────────────────┐      │
│                          │   │    Pinecone Vector DB     │      │
│                          │   │  (1024-dim, serverless)   │      │
│                          │   └──────────────────────────┘      │
└──────────────────────────┴──────────────────────────────────────┘
```

### Pipeline 1: Document Ingestion (Bootstrap)

Runs **once** to build the knowledge base. Triggered by `POST /api/bootstrap`.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  13 Legal    │     │  LangChain   │     │ RecursiveCharacter   │
│  Case PDFs   │────▶│  PDFLoader   │────▶│ TextSplitter         │
│  + db.json   │     │              │     │ (1000 chars/200 lap) │
└──────────────┘     └──────────────┘     └──────────┬───────────┘
                                                     │
                                                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   Pinecone   │◀────│ Batch Upsert │◀────│    Voyage AI         │
│   Index      │     │ (size=2)     │     │    voyage-law-2      │
│              │     │              │     │    (1024-dim output)  │
└──────────────┘     └──────────────┘     └──────────────────────┘
```

**Steps:**

1. Load all `.pdf` files from `docs/` directory using LangChain's `DirectoryLoader`
2. Read `docs/db.json` for metadata (title, plaintiff, defendant, date, topic, outcome)
3. Merge PDF content with JSON metadata per file
4. Split into **1000-character chunks** with **200-character overlap**
5. Generate **1024-dimensional embeddings** via Voyage AI (`voyage-law-2`, `inputType: "document"`)
6. Batch upsert vectors to Pinecone with UUID identifiers
7. Short-circuits if vectors already exist (idempotent)

### Pipeline 2: Semantic Search (Query)

Runs on every user search. Triggered by `POST /api/search`.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  User Query  │────▶│  Voyage AI   │────▶│   PineconeStore      │
│  (natural    │     │  voyage-law-2│     │   MMR Search (k=20)  │
│   language)  │     │  inputType:  │     │                      │
│              │     │   "query"    │     │                      │
└──────────────┘     └──────────────┘     └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │  De-duplicate by ID  │
                                          │  Return JSON results │
                                          └──────────────────────┘
```

**Steps:**

1. Embed the user query using the **same model** but with `inputType: "query"`
2. Run **Max Marginal Relevance (MMR)** search on Pinecone (`k=20` results)
3. De-duplicate results by `metadata.id`
4. Return results with full metadata and content excerpts

### User Journey (Sequence)

```
User              Frontend            /api/bootstrap      /api/ingest       Voyage AI         Pinecone
 │                   │                     │                   │               │                 │
 │── Opens app ─────▶│                     │                   │               │                 │
 │                   │── POST ────────────▶│                   │               │                 │
 │                   │                     │── POST ──────────▶│               │                 │
 │                   │                     │                   │── embed ─────▶│                 │
 │                   │                     │                   │◀── vectors ──│                 │
 │                   │                     │                   │── upsert ────────────────────▶│
 │                   │                     │                   │◀── OK ───────────────────────│
 │                   │◀── Index ready ─────│                   │               │                 │
 │                   │                     │                   │               │                 │
 │── Types query ──▶│                     │                   │               │                 │
 │                   │── POST /api/search ─────────────────────────── embed ─▶│                 │
 │                   │                                                        │── MMR search ─▶│
 │                   │                                                        │◀── results ───│
 │                   │◀── JSON results ─────────────────────────────────────────────────────────│
 │◀── Display ──────│                     │                   │               │                 │
```

---

## 🛠️ Technology Stack

| Layer              | Technology                                                                   | Purpose                                          |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| **Framework**      | Next.js 14 (App Router)                                                      | Server-side API routes + client-side SPA         |
| **Frontend**       | React 18, TailwindCSS                                                        | Dark-themed responsive UI                        |
| **Embeddings**     | Voyage AI (`voyage-law-2`)                                                   | Legal-domain-specific 1024-dim vector embeddings |
| **Vector DB**      | Pinecone (serverless, AWS us-east-1)                                         | Stores & searches document vectors               |
| **Doc Processing** | LangChain (`DirectoryLoader`, `PDFLoader`, `RecursiveCharacterTextSplitter`) | PDF parsing & text chunking                      |
| **Utilities**      | `uuid`, `pdf-parse`, `p-limit`                                               | ID generation, PDF parsing, concurrency          |

---

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- [Pinecone](https://www.pinecone.io/) account and API key
- [Voyage AI](https://www.voyageai.com/) API key

---

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/tanbiralam/legal-semantic-search.git
   cd legal-semantic-search
   ```

2. **Install dependencies**

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_pinecone_index_name
   VOYAGE_API_KEY=your_voyage_api_key
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Bootstrap the index** (auto-triggered on first load, or manually):
   ```bash
   curl -X POST http://localhost:3000/api/bootstrap
   ```

---

## 🔍 Usage

### Search

1. Enter your legal query in natural language (e.g., _"What constitutes cruel and unusual punishment?"_)
2. Or click a **suggested search** pill for quick exploration
3. Browse result cards showing case title, date, topic, and relevant excerpt
4. Click any result to open the **Document Viewer**

### Document Viewer

- View the most relevant quote from the matched case
- See auto-generated **Bluebook citation** (e.g., `Miranda v. Arizona, Miranda v. Arizona (1966)`)
- **Copy citation** to clipboard with one click
- Case relevance note summarizing topic and outcome

### Adding New Documents

1. Place PDF files in `docs/`
2. Add metadata to `docs/db.json`:
   ```json
   {
     "filename": "case_name.pdf",
     "title": "Case v. Name",
     "plaintiff": "Plaintiff",
     "defendant": "Defendant",
     "date": "1970",
     "topic": "Legal Topic",
     "outcome": "Ruling description"
   }
   ```
3. Delete the existing Pinecone index (or clear vectors) and re-run bootstrap

---

## 🛡️ API Reference

### `POST /api/bootstrap`

Entry point to trigger the full ingestion pipeline. Creates the Pinecone index if needed and delegates to `/api/ingest`.

**Response:** `{ "success": true }`

### `POST /api/ingest`

Worker endpoint that performs the actual document processing:

- Loads PDFs → chunks text → generates embeddings → upserts to Pinecone
- Idempotent: skips if vectors already exist

**Request Body:**

```json
{ "targetIndex": "your-index-name" }
```

### `POST /api/search`

Performs semantic search against the indexed documents.

**Request Body:**

```json
{ "query": "What are the limits on police searches?" }
```

**Response:**

```json
{
  "results": [
    {
      "metadata": {
        "id": "uuid",
        "title": "Mapp v. Ohio",
        "plaintiff": "Mapp",
        "defendant": "Ohio",
        "date": "1961",
        "topic": "Judicial Review",
        "outcome": "Strengthened Fourth Amendment protections",
        "pageContent": "relevant excerpt..."
      },
      "content": "relevant excerpt...",
      "pageContent": "relevant excerpt..."
    }
  ]
}
```

### `GET /api/health`

Simple health check endpoint. Returns `{ "status": "ok" }`.

### `GET /api/init`

Initializes the keep-alive service in production to prevent serverless cold starts.

---

## ⚙️ Configuration

### Environment Variables

| Variable              | Description                               | Required |
| --------------------- | ----------------------------------------- | -------- |
| `PINECONE_API_KEY`    | Pinecone API key                          | ✅       |
| `PINECONE_INDEX`      | Pinecone index name                       | ✅       |
| `VOYAGE_API_KEY`      | Voyage AI API key                         | ✅       |
| `VERCEL_URL`          | Auto-set by Vercel for internal API calls | ❌       |
| `PORT`                | Local dev port (default: 3000)            | ❌       |
| `NEXT_PUBLIC_APP_URL` | Keep-alive health check URL               | ❌       |

### Key Parameters

| Parameter            | Value           | Location          |
| -------------------- | --------------- | ----------------- |
| Vector dimensions    | 1024            | `pinecone.ts`     |
| Chunk size           | 1000 characters | `bootstrap.ts`    |
| Chunk overlap        | 200 characters  | `bootstrap.ts`    |
| MMR search results   | k=20            | `search/route.ts` |
| Embedding batch size | 5               | `bootstrap.ts`    |
| Upsert batch size    | 2               | `bootstrap.ts`    |
| Keep-alive interval  | 5 minutes       | `layout.tsx`      |

---

## 📚 Case Corpus

The knowledge base includes **13 landmark U.S. Supreme Court cases**:

| Case                      | Year | Topic                               |
| ------------------------- | ---- | ----------------------------------- |
| Marbury v. Madison        | 1803 | Judicial Review                     |
| Gibbons v. Ogden          | 1824 | Interstate Commerce                 |
| Mapp v. Ohio              | 1961 | Fourth Amendment (Search & Seizure) |
| Baker v. Carr             | 1962 | Redistricting                       |
| Gideon v. Wainwright      | 1963 | Right to Counsel                    |
| Miranda v. Arizona        | 1966 | Self-Incrimination Rights           |
| Tinker v. Des Moines      | 1969 | Student Free Speech                 |
| NY Times v. United States | 1971 | Freedom of the Press                |
| United States v. Nixon    | 1974 | Executive Privilege                 |
| United States v. Lopez    | 1995 | Commerce Clause                     |
| Bush v. Gore              | 2000 | Election Law                        |
| Roper v. Simmons          | 2005 | Cruel & Unusual Punishment          |
| DC v. Heller              | 2008 | Second Amendment                    |

---

## 📁 Project Structure

```
semantic-search-with-legal-docs/
├── docs/                          # Legal case PDFs + metadata
│   ├── db.json                    # Document metadata (title, parties, topic, outcome)
│   ├── miranda_vs_arizona.pdf
│   ├── marbury_vs_madison.pdf
│   └── ... (13 PDFs total)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── bootstrap/route.ts # Triggers ingestion pipeline
│   │   │   ├── ingest/route.ts    # Processes docs → embeddings → Pinecone
│   │   │   ├── search/route.ts    # Semantic search endpoint
│   │   │   ├── health/route.ts    # Health check
│   │   │   └── init/route.ts      # Keep-alive initializer
│   │   ├── services/
│   │   │   ├── bootstrap.ts       # Core ingestion logic
│   │   │   ├── pinecone.ts        # Pinecone client & helpers
│   │   │   └── keepAlive.ts       # Production keep-alive service
│   │   ├── types/
│   │   │   ├── document.tsx       # Document interface
│   │   │   └── search.ts          # SearchResult interface
│   │   ├── utils/batch.ts         # Array batching utility
│   │   ├── page.tsx               # Main page (search orchestrator)
│   │   ├── layout.tsx             # Root layout with keep-alive
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── Header.tsx             # Title + search form wrapper
│   │   ├── SearchForm.tsx         # Input + suggested searches
│   │   ├── SearchResults.tsx      # Result cards grid
│   │   ├── DocumentView.tsx       # Document modal with quote
│   │   ├── CitationGenerator.tsx  # Bluebook citation generator
│   │   ├── LoadingState.tsx       # Bootstrap loading overlay
│   │   └── ui/card.tsx            # Reusable Card component
│   └── lib/utils.ts               # cn(), sanitizeString(), formatDate()
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Vercel Deployment

The app is optimized for Vercel with:

- `maxDuration: 300` on the bootstrap route for long-running ingestion
- Keep-alive service to prevent cold starts
- `VERCEL_URL` env var auto-detection for internal API calls

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🆘 Support

For support and questions:

- Open an issue on GitHub
- Check the documentation for common setup issues
- Ensure all environment variables are properly configured

---

## 🔄 Changelog

### Version 1.0.0

- Initial release with semantic search functionality
- Document ingestion and processing pipeline
- Bluebook citation generation
- MMR-based diverse search results
- Dark-themed modern UI
