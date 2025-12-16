import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-4"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`glass rounded-2xl transition-all duration-300 ${
            isFocused ? "glow border-primary/50" : "border-border/30"
          }`}
        >
          <div className="flex items-end gap-2 p-2">
            {/* Attachment Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask Vault about your documents..."
                disabled={disabled}
                rows={1}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none py-2.5 px-2 focus:outline-none text-sm leading-relaxed max-h-32 min-h-[40px]"
                style={{
                  height: "auto",
                  minHeight: "40px",
                }}
              />
            </div>

            {/* Voice Input Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Mic className="w-5 h-5" />
            </Button>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={!message.trim() || disabled}
              size="icon"
              className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                message.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-sm"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {disabled ? (
                <Sparkles className="w-5 h-5 animate-pulse" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Vault uses AI to analyze your documents securely. 
          <span className="text-primary/70 ml-1 cursor-pointer hover:text-primary transition-colors">
            Learn more
          </span>
        </p>
      </form>
    </motion.div>
  );
}
