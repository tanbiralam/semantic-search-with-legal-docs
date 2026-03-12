"use client";

import { useEffect, useState } from "react";
import DocumentView from "@/components/DocumentView";
import { type SearchResult } from "./types/search";
import { type SearchMode } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { Header } from "@/components/Header";
import { SearchResults } from "@/components/SearchResults";
import { DeepSearchResults } from "@/components/DeepSearchResults";

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

const handleQuickSearch = async (
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
  const [searchMode, setSearchMode] = useState<SearchMode>("quick");
  const [deepSearchQuery, setDeepSearchQuery] = useState<string | null>(null);

  useEffect(() => {
    checkAndBootstrapIndex(setIsBootstrapping, setIsIndexReady);
  }, []);

  const clearResults = () => {
    setQuery("");
    setResults([]);
    setDeepSearchQuery(null);
  };

  const handleSearch = (searchQuery: string) => {
    if (searchMode === "quick") {
      handleQuickSearch(searchQuery, setResults, setIsSearching);
      setQuery(searchQuery);
      setDeepSearchQuery(null);
    } else {
      setDeepSearchQuery(searchQuery);
      setQuery(searchQuery);
      setResults([]);
    }
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
            onSearch={handleSearch}
            searchMode={searchMode}
            onModeChange={(mode) => {
              setSearchMode(mode);
              // Clear results when switching mode
              clearResults();
            }}
          />

          {/* Quick search loading spinner */}
          {isSearching && searchMode === "quick" && (
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-300 font-medium">
                Searching documents...
              </p>
            </div>
          )}

          {/* Quick search results */}
          {searchMode === "quick" && results.length > 0 && query && (
            <SearchResults
              results={results}
              query={query}
              onClear={clearResults}
              onViewDocument={(doc) => {
                setSelectedDocument(doc);
              }}
            />
          )}

          {/* Deep search results */}
          {searchMode === "deep" && deepSearchQuery && (
            <DeepSearchResults
              query={deepSearchQuery}
              onClear={clearResults}
            />
          )}
        </div>
      )}
    </main>
  );
}
