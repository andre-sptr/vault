import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, ChevronRight, Upload, Sparkles, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { streamVaultChat, parseCitations } from "@/lib/api/vault-chat";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/hooks/use-documents";
import { ChatMessage as ChatMessageType, Citation, Conversation } from "@/hooks/use-conversations";

interface ChatPanelProps {
  onCitationClick?: (citation: Citation) => void;
  selectedDocument: Document | null;
  onUploadClick: () => void;
  messages: ChatMessageType[];
  currentConversation: Conversation | null;
  onSendMessage: (content: string) => Promise<void>;
  isTyping: boolean;
  streamingContent: string;
}

export function ChatPanel({ 
  onCitationClick, 
  selectedDocument, 
  onUploadClick,
  messages,
  currentConversation,
  onSendMessage,
  isTyping,
  streamingContent,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 flex flex-col h-screen bg-background/50">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 py-4 border-b border-border/30 glass-subtle"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedDocument ? "Analyzing:" : "No document selected"}
            </span>
            {selectedDocument && (
              <>
                <span className="text-sm font-medium text-foreground">{selectedDocument.filename}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Welcome / Upload prompt when no document */}
          {!selectedDocument && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              {/* Decorative Illustration */}
              <div className="relative mb-8">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl scale-150" />
                
                {/* Floating documents illustration */}
                <div className="relative w-32 h-32">
                  {/* Main document */}
                  <motion.div
                    initial={{ y: 0 }}
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-20 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 shadow-lg flex items-center justify-center"
                  >
                    <FileText className="w-8 h-8 text-primary/70" />
                  </motion.div>
                  
                  {/* Floating decorative elements */}
                  <motion.div
                    initial={{ y: 0, rotate: 0 }}
                    animate={{ y: [-8, 8, -8], rotate: [0, 5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -left-2 top-4 w-10 h-12 rounded-md bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/20 shadow-md"
                  />
                  <motion.div
                    initial={{ y: 0, rotate: 0 }}
                    animate={{ y: [6, -6, 6], rotate: [0, -5, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    className="absolute -right-2 bottom-4 w-10 h-12 rounded-md bg-gradient-to-br from-secondary to-secondary/50 border border-border/30 shadow-md"
                  />
                  
                  {/* Sparkles */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-2 right-0 w-2 h-2 rounded-full bg-primary"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="absolute bottom-0 -left-4 w-1.5 h-1.5 rounded-full bg-accent"
                  />
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Welcome to Vault</h2>
              <p className="text-muted-foreground max-w-md mb-8 text-base">
                Upload a document to unlock AI-powered analysis. Ask questions, get summaries, and discover insights.
              </p>
              <Button onClick={onUploadClick} size="lg" className="gap-2 px-6">
                <Upload className="w-5 h-5" />
                Upload Document
              </Button>
              
              {/* Supported formats hint */}
              <p className="text-xs text-muted-foreground/60 mt-4">
                Supports PDF, TXT, DOC, and more
              </p>
            </motion.div>
          )}

          {/* Welcome message when document selected but no messages */}
          {selectedDocument && messages.length === 0 && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              {/* Ready to analyze illustration */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-accent/10 rounded-full blur-3xl scale-150" />
                
                <div className="relative w-28 h-28">
                  {/* Document with sparkle */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [0.9, 1, 0.9] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-18 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-lg flex items-center justify-center"
                  >
                    <FileText className="w-7 h-7 text-primary" />
                  </motion.div>
                  
                  {/* Orbiting chat bubble */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                  >
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-accent" />
                    </div>
                  </motion.div>
                  
                  {/* Sparkle effects */}
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-1 left-1/2 w-3 h-3"
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                  </motion.div>
                </div>
              </div>
              
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Ready to Analyze</h2>
              <p className="text-muted-foreground max-w-md mb-8 text-base">
                Ask me anything about{" "}
                <span className="text-primary font-medium">{selectedDocument.filename}</span>
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What are the key findings?",
                  "Summarize the main points",
                  "What data is included?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onSendMessage(suggestion)}
                    className="px-4 py-2.5 rounded-xl text-sm bg-secondary/50 hover:bg-secondary text-foreground border border-border/30 hover:border-primary/30 transition-all hover:scale-[1.02]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={{
                id: message.id,
                role: message.role,
                content: message.content,
                citations: message.citations,
              }}
              onCitationClick={onCitationClick}
            />
          ))}
          
          {/* Streaming response */}
          {isTyping && streamingContent && (
            <ChatMessage
              message={{
                id: "streaming",
                role: "assistant",
                content: streamingContent,
              }}
              onCitationClick={onCitationClick}
            />
          )}
          
          {/* Typing indicator */}
          {isTyping && !streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
              <span className="text-sm text-muted-foreground">Vault is analyzing your document...</span>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput 
          onSendMessage={onSendMessage} 
          disabled={isTyping || !selectedDocument} 
        />
      </div>
    </div>
  );
}
