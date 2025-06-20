# Legal Semantic Search

A powerful Next.js application that provides intelligent semantic search capabilities for legal documents using AI-powered embeddings and vector search technology.

## 🚀 Features

- **Semantic Search**: Natural language search powered by AI that understands legal concepts and terminology
- **Legal Document Processing**: Automated ingestion and processing of PDF legal documents
- **Vector Database**: Efficient similarity search using Pinecone vector database
- **Citation Generation**: Automatic Bluebook citation generation for legal documents
- **Modern UI**: Responsive, dark-themed interface with real-time search results
- **Document Viewer**: Detailed document information with relevant quote highlighting

## 🏛️Architecture Flow

![image](https://github.com/user-attachments/assets/2867e40b-de57-42be-ab22-e8e097adfec9)

This diagram outlines the full process for transforming case PDFs into a searchable vector knowledge base:

1. **Legal Case PDFs (.pdf + metadata)**  
   Source documents containing full case text along with optional metadata such as title, topic, and citation.

2. **Parse & Chunk PDFs (via LangChain)**  
   Each document is parsed and split into manageable chunks to prepare for embedding.

3. **Generate Embeddings (via Voyage AI – `voyage-law-2`)**  
   Chunked text is passed through a domain-specific embedding model to generate vector representations.

4. **Create Index (if needed) in Pinecone Vector DB**  
   A Pinecone index is created if not already available to store the generated vectors.

5. **Prepare for Semantic Query**  
   Each chunk is tagged with metadata and assigned a unique ID to support efficient semantic search.

6. **Optimize Vector Data (batch upserts, filtering, suggestion)**  
   The vectors are batch-inserted into Pinecone. Optional filtering, cleanup, and search optimization are applied.

7. **Semantic Search**  
   User queries are embedded using the same model and compared using Max Marginal Relevance (MMR) to retrieve the most relevant, diverse results.


## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Search Engine**: Pinecone Vector Database
- **AI/ML**: Voyage AI (Legal-specific embeddings)
- **Document Processing**: LangChain
- **Styling**: TailwindCSS with custom UI components

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Pinecone account and API key
- Voyage AI API key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tanbiralam/legal-semantic-search.git
   cd legal-semantic-search
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX=your_pinecone_index_name
   VOYAGE_API_KEY=your_voyage_api_key
   ```

4. **Prepare your documents**
   
   Place your legal PDF documents in the `docs/` directory and ensure you have a `db.json` file with document metadata.

5. **Initialize the database**
   
   Run the bootstrap process to index your documents:
   ```bash
   # This will process documents and create embeddings
   curl -X POST http://localhost:3000/api/bootstrap
   ```

6. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.


## 🔍 Usage

### Basic Search
1. Enter your legal query in natural language
2. View results with relevance scores and document metadata
3. Click on any result to view detailed information

### Document Management
- Add new PDF documents to the `docs/` directory
- Update `db.json` with document metadata
- Use the ingest API to process new documents

### Citation Generation
- View any document to automatically generate Bluebook citations
- Copy citations with a single click

## 🛡️ API Endpoints

### POST `/api/bootstrap`
Initializes the vector database and processes all documents in the `docs/` directory.

### POST `/api/search`
Performs semantic search on indexed documents.

**Request Body:**
```json
{
  "query": "your search query here"
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "document-id",
      "score": 0.95,
      "metadata": {
        "title": "Document Title",
        "court": "Supreme Court",
        "year": "2023"
      },
      "content": "relevant document excerpt"
    }
  ]
}
```

### POST `/api/ingest`
Ingests new documents into the vector database.

## ⚙️ Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `PINECONE_API_KEY` | Your Pinecone API key | Yes |
| `PINECONE_INDEX` | Name of your Pinecone index | Yes |
| `VOYAGE_API_KEY` | Your Voyage AI API key | Yes |

### Document Metadata Format
Ensure your `docs/db.json` follows this structure:
```json
{
  "documents": [
    {
      "id": "unique-document-id",
      "title": "Document Title",
      "court": "Court Name",
      "year": "2023",
      "filename": "document.pdf",
      "citation": "Full Legal Citation"
    }
  ]
}
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
Ensure all environment variables are properly configured in your production environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



## 🆘 Support

For support and questions:
- Open an issue on GitHub
- Check the documentation for common setup issues
- Ensure all environment variables are properly configured

## 🔄 Changelog

### Version 1.0.0
- Initial release with semantic search functionality
- Document ingestion and processing
- Citation generation
- Modern UI with dark theme

---
