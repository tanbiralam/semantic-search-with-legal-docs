"use client";

import { useEffect, useState } from "react";
import DocumentView from "@/components/DocumentView";
import { type SearchResult } from "./types/search";
import { LoadingState } from "@/components/LoadingState";
import { Header } from "@/components/Header";
import { SearchResults } from "@/components/SearchResults";

const suggestedSearches = [
  "What are the key elements of judicial review?",
  "How has the Second Amendment been interpreted?",
  "What constitutes cruel and unusual punishment?",
  "How has freedom of speech been defined in schools?",
  "What are the limits on police searches?",
];

const runBootstrapProcedure = async () => {
  const response = await fetch("/api/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.json();
    console.log(body);
    throw new Error(`API request failed with status ${response.status}`);
  }
};

const checkAndBootstrapIndex = async (
  setIsBootstrapping: (isBootstrapping: boolean) => void,
  setIsIndexReady: (isIndexReady: boolean) => void
) => {
  setIsBootstrapping(true);
  await runBootstrapProcedure();
  setIsBootstrapping(false);
  setIsIndexReady(true);
};

const handleSearch = async (
  query: string,
  setResults: (results: SearchResult[]) => void,
  setIsSearching: (isSearching: boolean) => void
) => {
  setIsSearching(true);
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.json();
    console.log(body);
    throw new Error(`API request failed with status ${response.status}`);
  }

  const { results } = await response.json();
  setResults(results);
  setIsSearching(false);
};

export default function Home() {
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SearchResult | null>(
    null
  );

  useEffect(() => {
    checkAndBootstrapIndex(setIsBootstrapping, setIsIndexReady);
  }, []);

  const clearResults = () => {
    setQuery("");
    setResults([]);
  };

  if (selectedDocument) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <DocumentView
          document={selectedDocument}
          quote={selectedDocument.metadata.pageContent}
          onClose={() => setSelectedDocument(null)}
          isOpen={true}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {isBootstrapping && (
        <LoadingState message="Processing legal documents..." />
      )}

      {isIndexReady && !isBootstrapping && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col">
          <Header
            suggestedSearches={suggestedSearches}
            onSearch={(query: string) => {
              handleSearch(query, setResults, setIsSearching);
              setQuery(query);
            }}
          />

          {isSearching && (
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-300 font-medium">
                Searching documents...
              </p>
            </div>
          )}

          {results.length > 0 && query && (
            <SearchResults
              results={results}
              query={query}
              onClear={clearResults}
              onViewDocument={(doc) => {
                setSelectedDocument(doc);
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}
