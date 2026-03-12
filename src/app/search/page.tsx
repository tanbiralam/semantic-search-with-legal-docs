"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DocumentView from "@/components/DocumentView";
import { type SearchResult } from "@/app/types/search";
import { type SearchMode } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { Header } from "@/components/Header";
import { SearchResults } from "@/components/SearchResults";
import { DeepSearchResults } from "@/components/DeepSearchResults";
import {
  checkAndBootstrapIndex,
  handleQuickSearch,
  suggestedSearches,
} from "@/lib/search-client";

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SearchResult | null>(
    null
  );
  const [searchMode, setSearchMode] = useState<SearchMode>("quick");

  const query = searchParams.get("q")?.trim() || "";
  const modeFromUrl: SearchMode =
    searchParams.get("mode") === "deep" ? "deep" : "quick";

  useEffect(() => {
    checkAndBootstrapIndex(setIsBootstrapping, setIsIndexReady);
  }, []);

  useEffect(() => {
    setSearchMode(modeFromUrl);
    setSelectedDocument(null);
  }, [modeFromUrl, query]);

  useEffect(() => {
    if (!query || modeFromUrl !== "quick") {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (!isIndexReady) return;

    let isActive = true;

    const runSearch = async () => {
      try {
        await handleQuickSearch(
          query,
          (nextResults) => {
            if (isActive) {
              setResults(nextResults);
            }
          },
          (nextIsSearching) => {
            if (isActive) {
              setIsSearching(nextIsSearching);
            }
          }
        );
      } catch (error) {
        if (isActive) {
          setIsSearching(false);
        }
        console.error("Quick search failed:", error);
      }
    };

    runSearch();

    return () => {
      isActive = false;
    };
  }, [isIndexReady, modeFromUrl, query]);

  const pushSearchRoute = (mode: SearchMode, nextQuery?: string) => {
    const params = new URLSearchParams();
    if (nextQuery) {
      params.set("q", nextQuery);
    }
    if (mode === "deep") {
      params.set("mode", "deep");
    } else if (nextQuery) {
      params.set("mode", "quick");
    }

    const nextUrl = params.toString() ? `/search?${params.toString()}` : "/search";
    router.push(nextUrl);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedDocument(null);
    pushSearchRoute(modeFromUrl);
  };

  const handleSearch = (searchQuery: string) => {
    setResults([]);
    setSelectedDocument(null);
    pushSearchRoute(searchMode, searchQuery);
  };

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setResults([]);
    setSelectedDocument(null);
    pushSearchRoute(mode);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {isBootstrapping && (
        <LoadingState message="Processing legal documents..." />
      )}

      {isIndexReady && !isBootstrapping && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen">
          <Header
            suggestedSearches={suggestedSearches}
            onSearch={handleSearch}
            searchMode={searchMode}
            onModeChange={handleModeChange}
            initialQuery={query}
            showSuggestions={false}
            variant="compact"
          />

          {isSearching && modeFromUrl === "quick" && (
            <div className="flex items-center justify-center space-x-3 mb-8">
              <div className="w-5 h-5 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-300 font-medium">
                Searching documents...
              </p>
            </div>
          )}

          {modeFromUrl === "quick" && results.length > 0 && query && (
            <SearchResults
              results={results}
              query={query}
              onClear={clearResults}
              onViewDocument={(doc) => {
                setSelectedDocument(doc);
              }}
            />
          )}

          {modeFromUrl === "deep" && query && (
            <DeepSearchResults query={query} onClear={clearResults} />
          )}

          {!query && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 px-6 py-10 text-center text-gray-400">
              Enter a query above to search the legal archive.
            </div>
          )}
        </div>
      )}

      {selectedDocument && (
        <DocumentView
          document={selectedDocument}
          quote={selectedDocument.metadata.pageContent}
          onClose={() => setSelectedDocument(null)}
          isOpen={true}
        />
      )}
    </main>
  );
}
