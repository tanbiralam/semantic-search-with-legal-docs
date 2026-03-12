"use client";

import { useState, useEffect, useRef } from "react";
import { type DeepSearchChunk } from "@/app/types/deep-search";

interface DeepSearchResultsProps {
  query: string;
  onClear: () => void;
}

export function DeepSearchResults({ query, onClear }: DeepSearchResultsProps) {
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const [statusMessage, setStatusMessage] = useState(
    "Initializing deep search..."
  );
  const [isSearchingDocs, setIsSearchingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    const runDeepSearch = async () => {
      try {
        const response = await fetch("/api/deep-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json();
          setError(body.error || "Deep search failed");
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setError("No response stream available");
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let partialLine = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = (partialLine + text).split("\n");
          partialLine = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6); // Remove "data: " prefix
            if (data === "[DONE]") {
              setIsStreaming(false);
              setIsSearchingDocs(false);
              continue;
            }

            try {
              const chunk: DeepSearchChunk = JSON.parse(data);

              switch (chunk.type) {
                case "status":
                  setStatusMessage(chunk.message || "Processing...");
                  break;
                case "content":
                  setAnswer((prev) => prev + (chunk.text || ""));
                  setIsSearchingDocs(false);
                  break;
                case "source":
                  if (chunk.status === "started") {
                    setIsSearchingDocs(true);
                    setStatusMessage("Searching through document trees...");
                  } else if (chunk.status === "result") {
                    setStatusMessage("Found relevant content, generating answer...");
                  }
                  break;
                case "error":
                  setError(chunk.message || "Unknown error");
                  setIsStreaming(false);
                  break;
                case "done":
                  setIsStreaming(false);
                  setIsSearchingDocs(false);
                  break;
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        setIsStreaming(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "Network error");
          setIsStreaming(false);
        }
      }
    };

    runDeepSearch();
    return () => controller.abort();
  }, [query]);

  // Auto-scroll to bottom as content streams
  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [answer]);

  if (error) {
    return (
      <div className="w-full">
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-red-400 font-semibold flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Deep Search Error
            </h3>
            <button
              onClick={onClear}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Clear results"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-purple-400"
            >
              <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
              <path d="M12 2a10 10 0 0 1 10 10" />
              <path d="M12 12l8-2" />
            </svg>
          </div>
          <div>
            <p className="text-gray-200 text-sm">
              Deep AI Analysis for{" "}
              <span className="font-medium">&quot;{query}&quot;</span>
            </p>
            {isStreaming && (
              <p className="text-purple-400 text-xs mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                {statusMessage}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Clear results"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Searching animation */}
      {isStreaming && !answer && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-purple-500/30 rounded-full" />
            <div className="absolute inset-0 w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-gray-300 font-medium">{statusMessage}</p>
            {isSearchingDocs && (
              <p className="text-gray-500 text-sm mt-1">
                Navigating document tree structures with AI reasoning...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Streamed AI answer */}
      {answer && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 to-indigo-600" />

          <div ref={answerRef} className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                {answer}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          {!isStreaming && (
            <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10H12V2Z" />
                </svg>
                Powered by PageIndex + AI reasoning
              </div>
              <span className="text-xs text-gray-600">
                {answer.length.toLocaleString()} characters
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
