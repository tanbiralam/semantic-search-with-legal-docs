import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST() {
  try {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "generate_trees.py"
    );

    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      env: {
        ...process.env,
        NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || "",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    return new Promise<Response>((resolve) => {
      pythonProcess.on("close", (code: number) => {
        if (code === 0) {
          resolve(
            NextResponse.json({
              success: true,
              message: "Tree generation completed",
              output: stdout,
            })
          );
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                message: "Tree generation failed",
                error: stderr || stdout,
              },
              { status: 500 }
            )
          );
        }
      });

      pythonProcess.on("error", (err: Error) => {
        resolve(
          NextResponse.json(
            {
              success: false,
              message: `Failed to start Python: ${err.message}`,
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate trees",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
