import SearchForm from "./SearchForm";

interface HeaderProps {
  onSearch: (query: string) => void;
  suggestedSearches: string[];
}

export function Header({ onSearch, suggestedSearches }: HeaderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 -mt-32">
      <h1 className="text-5xl font-bold text-white mb-4 text-center tracking-tight">
        Legal Document Search
      </h1>
      <p className="text-xl text-gray-300 mb-12 max-w-2xl text-center leading-relaxed">
        Explore legal documents and precedents using natural language search
        powered by AI
      </p>

      <div className="w-full max-w-3xl mb-16">
        <SearchForm suggestedSearches={suggestedSearches} onSearch={onSearch} />
      </div>
    </div>
  );
}
