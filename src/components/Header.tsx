import SearchForm, { type SearchMode } from "./SearchForm";

interface HeaderProps {
  onSearch: (query: string) => void;
  suggestedSearches: string[];
  searchMode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  initialQuery?: string;
  showSuggestions?: boolean;
  variant?: "hero" | "compact";
}

export function Header({
  onSearch,
  suggestedSearches,
  searchMode,
  onModeChange,
  initialQuery = "",
  showSuggestions = true,
  variant = "hero",
}: HeaderProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={
        isCompact
          ? "w-full pt-10 pb-8"
          : "flex-1 flex flex-col items-center justify-center py-16 -mt-32"
      }
    >
      <h1
        className={
          isCompact
            ? "text-3xl font-bold text-white mb-3 tracking-tight"
            : "text-5xl font-bold text-white mb-4 text-center tracking-tight"
        }
      >
        Legal Document Search
      </h1>
      <p
        className={
          isCompact
            ? "text-base text-gray-300 mb-8 max-w-3xl leading-relaxed"
            : "text-xl text-gray-300 mb-12 max-w-2xl text-center leading-relaxed"
        }
      >
        Explore legal documents and precedents using natural language search
        powered by AI
      </p>

      <div className={`w-full max-w-3xl ${isCompact ? "" : "mb-16"}`}>
        <SearchForm
          suggestedSearches={suggestedSearches}
          onSearch={onSearch}
          searchMode={searchMode}
          onModeChange={onModeChange}
          initialQuery={initialQuery}
          showSuggestions={showSuggestions}
        />
      </div>
    </div>
  );
}
