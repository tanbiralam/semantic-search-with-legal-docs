import { useState } from "react";

interface SearchFormProps {
  suggestedSearches: string[];
  onSearch: (query: string) => void;
}

export default function SearchForm({
  suggestedSearches,
  onSearch,
}: SearchFormProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about legal precedents..."
            className="w-full px-6 py-4 text-lg bg-gray-800 border border-gray-700 rounded-xl shadow-sm placeholder-gray-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

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
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:border-indigo-500 hover:text-indigo-400 transition-colors text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
