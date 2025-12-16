import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Document } from "@/hooks/use-documents";

interface DocumentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedText?: string;
  document: Document | null;
}

export function DocumentPanel({ isOpen, onClose, highlightedText, document }: DocumentPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 32;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 20, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 380 }}
          exit={{ opacity: 0, x: 20, width: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-screen flex flex-col glass border-l border-border/50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Source Document</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {document?.filename || "No document selected"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-secondary/50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">100%</span>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Document Content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {!document ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No document selected</p>
                  <p className="text-xs text-muted-foreground/70">Upload or select a document to view</p>
                </div>
              ) : document.status === "processing" ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-muted-foreground">Processing document...</p>
                  <p className="text-xs text-muted-foreground/70">Extracting text content</p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-surface-elevated rounded-xl p-6 border border-border/30"
                >
                  {/* Document Preview */}
                  <div className="space-y-4">
                    <div className="h-3 bg-muted/50 rounded w-1/3" />
                    <div className="space-y-2">
                      <div className="h-2 bg-muted/30 rounded w-full" />
                      <div className="h-2 bg-muted/30 rounded w-5/6" />
                      <div className="h-2 bg-muted/30 rounded w-4/5" />
                    </div>
                    
                    {/* Extracted Text Preview */}
                    {document.extracted_text && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative p-4 rounded-lg bg-primary/10 border border-primary/30"
                      >
                        <div className="absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-full" />
                        <p className="text-sm text-foreground leading-relaxed line-clamp-6">
                          {document.extracted_text.slice(0, 500)}...
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-primary font-medium">Extracted Content</span>
                          <span className="text-xs text-muted-foreground">
                            • {document.extracted_text.length.toLocaleString()} characters
                          </span>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <div className="h-2 bg-muted/30 rounded w-full" />
                      <div className="h-2 bg-muted/30 rounded w-11/12" />
                      <div className="h-2 bg-muted/30 rounded w-4/5" />
                      <div className="h-2 bg-muted/30 rounded w-full" />
                      <div className="h-2 bg-muted/30 rounded w-3/4" />
                    </div>

                    <div className="pt-4 border-t border-border/30">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><span className="font-medium">File:</span> {document.filename}</p>
                        <p><span className="font-medium">Size:</span> {(document.file_size / 1024).toFixed(1)} KB</p>
                        <p><span className="font-medium">Type:</span> {document.mime_type}</p>
                        <p><span className="font-medium">Status:</span> {document.status}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          {/* Page Navigation */}
          <div className="p-4 border-t border-border/30 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || !document}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page <span className="text-foreground font-medium">{currentPage}</span> of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || !document}
              className="gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
