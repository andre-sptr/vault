import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, FileText, Loader2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Document } from "@/hooks/use-documents";
import { formatDistanceToNow } from "date-fns";

interface SearchResult {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  score: number;
  matches: Array<{ term: string; context: string; position: number }>;
  preview: string;
}

interface DocumentSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (doc: Document) => void;
}

export function DocumentSearch({ isOpen, onClose, onSelectDocument }: DocumentSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setHasSearched(true);

      try {
        const { data, error } = await supabase.functions.invoke("search-documents", {
          body: { query: query.trim(), limit: 20 },
        });

        if (error) {
          console.error("Search error:", error);
          setResults([]);
        } else {
          setResults(data?.results || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelectResult = async (result: SearchResult) => {
    // Fetch full document
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("id", result.id)
      .maybeSingle();

    if (data) {
      onSelectDocument(data as Document);
      onClose();
    }
  };

  const highlightMatch = (text: string, terms: string[]) => {
    let result = text;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, "gi");
      result = result.replace(regex, '<mark class="bg-primary/30 text-primary px-0.5 rounded">$1</mark>');
    }
    return result;
  };

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl glass rounded-2xl border border-border/50 overflow-hidden shadow-2xl"
        >
          {/* Search Input */}
          <div className="p-4 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search across all documents..."
                className="pl-12 pr-12 py-6 text-lg bg-secondary/30 border-border/30 focus:border-primary/50"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Search through document content and filenames
            </p>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <span className="ml-2 text-muted-foreground">Searching...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((result) => (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      searchTerms={query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)}
                      onClick={() => handleSelectResult(result)}
                    />
                  ))}
                </div>
              ) : hasSearched ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground/70">Try different search terms</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground/70">Start typing to search</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">ESC</kbd>
                to close
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono">↵</kbd>
                to select
              </span>
            </div>
            {results.length > 0 && (
              <span>{results.length} results found</span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SearchResultItem({
  result,
  searchTerms,
  onClick,
}: {
  result: SearchResult;
  searchTerms: string[];
  onClick: () => void;
}) {
  const highlightText = (text: string) => {
    let highlighted = text;
    for (const term of searchTerms) {
      const regex = new RegExp(`(${term})`, "gi");
      highlighted = highlighted.replace(
        regex,
        '<mark class="bg-primary/30 text-primary px-0.5 rounded font-medium">$1</mark>'
      );
    }
    return highlighted;
  };

  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl hover:bg-secondary/50 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="font-medium text-foreground truncate"
              dangerouslySetInnerHTML={{ __html: highlightText(result.filename) }}
            />
            <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {result.score} matches
            </span>
          </div>
          
          {result.matches.length > 0 && (
            <p
              className="text-sm text-muted-foreground line-clamp-2 mb-2"
              dangerouslySetInnerHTML={{ __html: highlightText(result.matches[0].context) }}
            />
          )}
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
            </span>
            <span>{(result.file_size / 1024).toFixed(1)} KB</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-3" />
      </div>
    </motion.button>
  );
}
