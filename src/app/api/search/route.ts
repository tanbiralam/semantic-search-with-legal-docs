import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { PineconeStore } from "@langchain/pinecone";

export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    console.log("🔍 Starting search for query:", query);

    // Validate environment variables
    if (!process.env.PINECONE_API_KEY) {
      console.error("Missing PINECONE_API_KEY");
      throw new Error("Missing PINECONE_API_KEY");
    }
    if (!process.env.PINECONE_INDEX) {
      console.error("Missing PINECONE_INDEX");
      throw new Error("Missing PINECONE_INDEX");
    }
    if (!process.env.VOYAGE_API_KEY) {
      console.error("Missing VOYAGE_API_KEY");
      throw new Error("Missing VOYAGE_API_KEY");
    }

    // Initialize Pinecone client
    console.log("Initializing Pinecone client...");
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    // Initialize VoyageEmbeddings with correct inputType for queries
    console.log("Initializing Voyage embeddings...");
    const voyageEmbeddings = new VoyageEmbeddings({
      apiKey: process.env.VOYAGE_API_KEY,
      inputType: "query",
      modelName: "voyage-law-2",
    });

    // Initialize PineconeStore
    console.log("Initializing Pinecone store...");
    const vectorStore = new PineconeStore(voyageEmbeddings, {
      pineconeIndex: pc.Index(process.env.PINECONE_INDEX as string),
    });

    console.log("Performing similarity search...");
    const retrieved = await vectorStore.maxMarginalRelevanceSearch(query, {
      k: 20,
    });

    console.log(`Found ${retrieved.length} initial results`);

    // Filter to ensure results set is unique - filter on the metadata.id
    const results = retrieved
      .filter((result, index) => {
        return (
          index ===
          retrieved.findIndex((otherResult) => {
            return result.metadata.id === otherResult.metadata.id;
          })
        );
      })
      .map((result) => {
        // Get the document content from either pageContent or metadata
        const documentContent =
          result.pageContent || result.metadata.pageContent;

        // Ensure content is available in all fields
        return {
          metadata: {
            ...result.metadata,
            pageContent: documentContent,
          },
          // Set both content fields to ensure availability
          content: documentContent,
          pageContent: documentContent,
        };
      });

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error("Error performing similarity search:", error);
    return NextResponse.json(
      {
        error: "Failed to perform similarity search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
