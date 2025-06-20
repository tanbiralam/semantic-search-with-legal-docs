import { useEffect, useRef, useState } from "react";
import { sanitizeString } from "@/lib/utils";
import CitationGenerator from "./CitationGenerator";
import { type SearchResult } from "@/app/types/search";
import { formatDate } from "@/lib/utils";

interface DocumentViewProps {
  document: SearchResult;
  quote: string;
  onClose: () => void;
  isOpen: boolean;
}

export default function DocumentView({
  document,
  quote,
  onClose,
  isOpen,
}: DocumentViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      window.document.body.style.overflow = "hidden";
    } else {
      window.document.body.style.overflow = "unset";
    }
    return () => {
      window.document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (contentRef.current && isOpen) {
      const highlight = contentRef.current.querySelector(".highlight");
      if (highlight) {
        highlight.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [quote, isOpen]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      const currentScrollY = target.scrollTop;
      setIsHeaderVisible(currentScrollY < lastScrollY || currentScrollY < 10);
      setLastScrollY(currentScrollY);

      // Calculate reading progress
      if (contentRef.current) {
        const totalHeight =
          contentRef.current.scrollHeight - target.clientHeight;
        const progress = (currentScrollY / totalHeight) * 100;
        setReadingProgress(Math.min(Math.max(progress, 0), 100));
      }
    };

    const modalContent = modalRef.current;
    if (modalContent) {
      modalContent.addEventListener("scroll", handleScroll, { passive: true });
      return () => modalContent.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY]);

  const getVerdictColor = (outcome: string) => {
    const lowerOutcome = outcome?.toLowerCase() || "";
    if (lowerOutcome.includes("affirmed")) return "emerald";
    if (lowerOutcome.includes("reversed")) return "rose";
    if (lowerOutcome.includes("remanded")) return "amber";
    return "gray";
  };

  const verdictColor = getVerdictColor(document.metadata.outcome);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        <div className="fixed inset-0" aria-hidden="true" />

        <div className="inline-block w-full max-w-6xl my-8 p-6 text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-700"
              aria-label="Close document view"
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
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-3xl font-bold text-gray-100 mb-4">
              {document.metadata.title}
            </h2>

            <div className="flex flex-wrap gap-3 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-md bg-gray-700 text-gray-200 text-sm">
                {formatDate(document.metadata.date)}
              </span>
              {document.metadata.topic && (
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-indigo-900/50 text-indigo-200 text-sm">
                  {document.metadata.topic}
                </span>
              )}
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="bg-gray-900/50 rounded-xl p-6 mb-8 border border-gray-700">
                <h3 className="text-xl font-semibold text-gray-100 mb-4">
                  Relevant Quote
                </h3>
                <p className="text-gray-50 font-medium italic border-l-4 border-indigo-500 pl-4 bg-gray-800/50 p-4 rounded">
                  {quote}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700">
            <CitationGenerator document={document} />
          </div>
        </div>
      </div>
    </div>
  );
}
