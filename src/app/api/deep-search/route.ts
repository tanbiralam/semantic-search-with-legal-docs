import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: Request) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const treesDir = path.join(process.cwd(), "docs", "trees");
    const mappingPath = path.join(treesDir, "_doc_id_mapping.json");

    if (!fs.existsSync(mappingPath)) {
      return NextResponse.json(
        {
          error:
            "Tree index not generated yet. Run: python scripts/generate_trees.py",
        },
        { status: 503 }
      );
    }

    const docIdMapping: Record<string, string> = JSON.parse(
      fs.readFileSync(mappingPath, "utf-8")
    );
    const docIds = Object.values(docIdMapping).filter(Boolean);

    if (docIds.length === 0) {
      return NextResponse.json(
        { error: "No document trees found. Run generate_trees.py first." },
        { status: 503 }
      );
    }

    const pythonInput = JSON.stringify({ query, doc_ids: docIds });

    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(process.cwd(), "scripts", "deep_search.py");
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      env: {
        ...process.env,
        PAGEINDEX_API_KEY: process.env.PAGEINDEX_API_KEY || "",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    pythonProcess.stdin.write(pythonInput);
    pythonProcess.stdin.end();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        let stderrOutput = "";

        let buffer = "";

        pythonProcess.stdout.on("data", (data: Buffer) => {
          buffer += data.toString();

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              controller.enqueue(encoder.encode(`data: ${line.trim()}\n\n`));
            }
          }
        });

        pythonProcess.stderr.on("data", (data: Buffer) => {
          stderrOutput += data.toString();
        });

        pythonProcess.on("close", (code: number) => {
          if (buffer.trim()) {
            controller.enqueue(encoder.encode(`data: ${buffer.trim()}\n\n`));
          }

          if (code !== 0 && stderrOutput) {
            const errorChunk = JSON.stringify({
              type: "error",
              message: `Python process exited with code ${code}: ${stderrOutput.slice(0, 500)}`,
            });
            controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        });

        pythonProcess.on("error", (err: Error) => {
          const errorChunk = JSON.stringify({
            type: "error",
            message: `Failed to start Python process: ${err.message}. Ensure Python is installed and virtual environment is activated.`,
          });
          controller.enqueue(encoder.encode(`data: ${errorChunk}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in deep search:", error);
    return NextResponse.json(
      {
        error: "Failed to perform deep search",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
