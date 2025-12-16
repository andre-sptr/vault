import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Citation {
  id: number;
  page: number;
  text: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (citation: Citation) => void;
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <Avatar className={`w-8 h-8 flex-shrink-0 ${isUser ? "bg-user-bubble" : "bg-primary/20"} border border-border/50`}>
        <AvatarFallback className={isUser ? "bg-user-bubble text-white" : "bg-primary/20 text-primary"}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? "bg-user-bubble text-white rounded-tr-md"
              : "bg-ai-bubble text-foreground rounded-tl-md border border-border/30"
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="text-sm leading-relaxed mb-3 last:mb-0">{children}</p>,
                  h1: ({ children }) => <h1 className="text-lg font-bold text-primary mb-2 mt-4 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold text-primary mb-2 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mb-1 mt-2 first:mt-0">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm">{children}</ol>,
                  li: ({ children }) => <li className="text-sm">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-xs font-mono text-primary">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-secondary/50 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground my-2">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          
          {message.citations && message.citations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/10">
              {message.citations.map((citation) => (
                <CitationChip
                  key={citation.id}
                  citation={citation}
                  onClick={() => onCitationClick?.(citation)}
                />
              ))}
            </div>
          )}
        </div>
        
        <span className="text-xs text-muted-foreground px-2">
          {isUser ? "You" : "Vault AI"}
        </span>
      </div>
    </motion.div>
  );
}

function CitationChip({ citation, onClick }: { citation: Citation; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-citation/20 text-citation hover:bg-citation/30 border border-citation/30 hover:border-citation/50 transition-all duration-200 cursor-pointer"
      title={citation.text}
    >
      <span>[{citation.id}]</span>
      <span className="text-citation/70">p.{citation.page}</span>
    </motion.button>
  );
}
