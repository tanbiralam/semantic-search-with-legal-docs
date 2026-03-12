"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import DocumentView from "@/components/DocumentView";
import { type SearchResult } from "@/app/types/search";
import SearchForm, { type SearchMode } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { SearchResults } from "@/components/SearchResults";
import { DeepSearchResults } from "@/components/DeepSearchResults";
import {
  checkAndBootstrapIndex,
  suggestedSearches,
  handleQuickSearch,
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
    if (!query) {
      router.replace("/");
    }
  }, [query, router]);

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
    const trimmedQuery = nextQuery?.trim();

    if (!trimmedQuery) {
      router.push("/");
      return;
    }

    const params = new URLSearchParams({ q: trimmedQuery });
    if (mode === "deep") {
      params.set("mode", "deep");
    }

    router.push(`/search?${params.toString()}`);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedDocument(null);
    router.push("/");
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
    pushSearchRoute(mode, query);
  };

  if (!query) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 text-sm text-gray-400 sm:px-6 lg:px-8">
          Redirecting to the landing page...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {isBootstrapping && (
        <LoadingState message="Processing legal documents..." />
      )}

      {isIndexReady && !isBootstrapping && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen py-8">
          <section className="mb-10 rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              <span aria-hidden="true">←</span>
              Back to Home
            </Link>

            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:items-start">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-gray-300">
                  {modeFromUrl === "deep" ? "Deep Analysis" : "Search Results"}
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {modeFromUrl === "deep"
                      ? "Reason across the case archive"
                      : "Review the strongest matching passages"}
                  </h1>
                  <p className="max-w-2xl text-base leading-relaxed text-gray-300">
                    {modeFromUrl === "deep"
                      ? `Analyzing the archive for "${query}" with document-tree reasoning.`
                      : `Showing semantic matches for "${query}" across the legal archive.`}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
                <SearchForm
                  suggestedSearches={suggestedSearches}
                  onSearch={handleSearch}
                  searchMode={searchMode}
                  onModeChange={handleModeChange}
                  initialQuery={query}
                  showSuggestions={false}
                />
              </div>
            </div>
          </section>

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
