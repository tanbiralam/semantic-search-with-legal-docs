"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type SearchMode } from "@/components/SearchForm";
import { LoadingState } from "@/components/LoadingState";
import { Header } from "@/components/Header";
import {
  checkAndBootstrapIndex,
  suggestedSearches,
} from "@/lib/search-client";

export default function Home() {
  const router = useRouter();
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("quick");

  useEffect(() => {
    checkAndBootstrapIndex(setIsBootstrapping, setIsIndexReady);
  }, []);

  const handleSearch = (searchQuery: string) => {
    const params = new URLSearchParams({
      q: searchQuery,
      mode: searchMode,
    });

    router.push(`/search?${params.toString()}`);
  };

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
            onModeChange={setSearchMode}
          />
        </div>
      )}
    </main>
  );
}
