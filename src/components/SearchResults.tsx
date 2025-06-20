import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { sanitizeString } from "@/lib/utils";
import { type SearchResult } from "@/app/types/search";

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onClear: () => void;
  onViewDocument: (doc: SearchResult) => void;
}

export function SearchResults({
  results,
  query,
  onClear,
  onViewDocument,
}: SearchResultsProps) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
        <p className="text-gray-200">
          Found{" "}
          <span className="font-semibold text-indigo-400">
            {results.length}
          </span>{" "}
          result{results.length > 1 ? "s" : ""} for{" "}
          <span className="font-medium">&quot;{query}&quot;</span>
        </p>
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

      <div className="grid grid-cols-1 gap-6">
        {results.map((result, index) => (
          <Card
            key={index}
            className="group relative bg-gray-800 hover:shadow-xl transition-all duration-300 border-0 ring-1 ring-gray-700 hover:ring-gray-600 overflow-hidden cursor-pointer"
            onClick={() => onViewDocument(result)}
          >
            <CardContent className="p-0">
              <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-indigo-600" />

              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors line-clamp-2 mb-3">
                  {result.metadata.title}
                </h2>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-700 text-gray-200 text-sm">
                    {formatDate(result.metadata.date)}
                  </span>
                  {result.metadata.topic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-900/50 text-indigo-200 text-sm">
                      {result.metadata.topic}
                    </span>
                  )}
                </div>

                <div className="relative mb-6">
                  <div className="absolute -left-3 top-1 w-1 h-[calc(100%-8px)] bg-indigo-900/30 rounded-full" />
                  <p className="text-gray-300 line-clamp-3 text-sm pl-4 italic">
                    {sanitizeString(result.metadata.pageContent)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-6 items-center space-x-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-gray-400">Topic:</span>
                      <span className="font-medium text-gray-200">
                        {result.metadata.topic || "General"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex h-6 items-center space-x-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-gray-400">Year:</span>
                      <span className="font-medium text-gray-200">
                        {new Date(result.metadata.date).getFullYear() || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
