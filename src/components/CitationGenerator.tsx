import React, { useState } from "react";
import { Card } from "./ui/card";
import { type SearchResult } from "@/app/types/search";

interface CitationGeneratorProps {
  document: SearchResult;
}

export default function CitationGenerator({
  document,
}: CitationGeneratorProps) {
  const [copied, setCopied] = useState(false);

  // Generate Bluebook citation
  const generateBluebookCitation = () => {
    const { title, plaintiff, defendant, date } = document.metadata;
    const year = new Date(date).getFullYear();
    return `${plaintiff} v. ${defendant}, ${title} (${year})`;
  };

  // Generate a brief explanation of the case's relevance
  const generateRelevanceNote = () => {
    const { outcome, topic } = document.metadata;
    return `This case addresses ${topic.toLowerCase()} and resulted in ${outcome.toLowerCase()}.`;
  };

  const handleCopy = async () => {
    const citation = generateBluebookCitation();
    await navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-100 mb-4">
            Legal Citation
          </h3>
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-gray-300 font-mono">
              {generateBluebookCitation()}
            </p>

            <button
              onClick={handleCopy}
              className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
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
                className={copied ? "text-green-400" : "text-white"}
              >
                {copied ? (
                  <>
                    <path d="M20 6 9 17l-5-5" />
                  </>
                ) : (
                  <>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </>
                )}
              </svg>
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-white">Relevance</h3>
          <p className="mt-1 text-sm text-gray-300">
            {generateRelevanceNote()}
          </p>
        </div>

        <p className="mt-4 text-sm text-gray-400">
          This citation follows the Bluebook format, commonly used in legal
          documents and academic papers.
        </p>
      </div>
    </Card>
  );
}
