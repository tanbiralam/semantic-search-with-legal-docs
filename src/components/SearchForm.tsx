import { useEffect, useState } from "react";

export type SearchMode = "quick" | "deep";

interface SearchFormProps {
  suggestedSearches: string[];
  onSearch: (query: string) => void;
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  initialQuery?: string;
  showSuggestions?: boolean;
}

export default function SearchForm({
  suggestedSearches,
  onSearch,
  searchMode,
  onModeChange,
  initialQuery = "",
  showSuggestions = true,
}: SearchFormProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const isDeep = searchMode === "deep";
  const accentColor = isDeep ? "purple" : "indigo";

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isDeep
                ? "Ask a deep question about legal precedents..."
                : "Ask a question about legal precedents..."
            }
            className={`w-full px-6 py-4 text-lg bg-gray-800 border border-gray-700 rounded-xl shadow-sm placeholder-gray-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-${accentColor}-500 focus:border-transparent transition-shadow`}
          />
          <button
            type="submit"
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 ${
              isDeep
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white rounded-lg transition-colors`}
          >
            {isDeep ? "Deep Search" : "Search"}
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center bg-gray-800 rounded-lg border border-gray-700 p-0.5"
            role="radiogroup"
            aria-label="Search mode"
          >
            <button
              role="radio"
              aria-checked={!isDeep}
              onClick={() => onModeChange("quick")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                !isDeep
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              ⚡ Quick
            </button>
            <button
              role="radio"
              aria-checked={isDeep}
              onClick={() => onModeChange("deep")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                isDeep
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              🧠 Deep
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {isDeep
              ? "AI reasons through document trees — deeper, slower"
              : "Vector similarity search — fast results"}
          </span>
        </div>
      </div>

      {showSuggestions && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-200">
            Try searching for:
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestedSearches.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(suggestion);
                  onSearch(suggestion);
                }}
                className={`px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-${accentColor}-500 hover:text-${accentColor}-400 transition-colors text-sm`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
