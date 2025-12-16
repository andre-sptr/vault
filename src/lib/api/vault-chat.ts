type Message = { role: "user" | "assistant"; content: string };

interface StreamChatOptions {
  messages: Message[];
  documentContext?: { filename: string; extractedText?: string };
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vault-chat`;

export async function streamVaultChat({
  messages,
  documentContext,
  onDelta,
  onDone,
  onError,
}: StreamChatOptions) {
  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, documentContext }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        onError("Rate limit exceeded. Please wait a moment and try again.");
        return;
      }
      if (response.status === 402) {
        onError("AI usage limit reached. Please add credits to continue.");
        return;
      }
      onError(errorData.error || "Failed to connect to AI service");
      return;
    }

    if (!response.body) {
      onError("No response stream available");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        // Handle CRLF
        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }

        // Skip empty lines and comments
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onDelta(content);
          }
        } catch {
          // Incomplete JSON, put back in buffer
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split("\n");
      for (let line of lines) {
        if (!line) continue;
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onDelta(content);
          }
        } catch {
          // Ignore parse errors on final flush
        }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError(error instanceof Error ? error.message : "Failed to stream response");
  }
}

// Parse citations from AI response
export function parseCitations(content: string): { 
  text: string; 
  citations: Array<{ id: number; page: number; text: string }> 
} {
  const citations: Array<{ id: number; page: number; text: string }> = [];
  
  // Find CITATIONS section at the end
  const citationMatch = content.match(/CITATIONS:\s*([\s\S]*?)$/i);
  
  if (citationMatch) {
    const citationSection = citationMatch[1];
    const citationLines = citationSection.split("\n").filter(line => line.trim());
    
    citationLines.forEach((line) => {
      const match = line.match(/\[(\d+)\]\s*Page\s*(\d+)\s*[-–]\s*(.+)/i);
      if (match) {
        citations.push({
          id: parseInt(match[1]),
          page: parseInt(match[2]),
          text: match[3].trim(),
        });
      }
    });
    
    // Remove citations section from main text
    const textWithoutCitations = content.replace(/CITATIONS:\s*[\s\S]*$/i, "").trim();
    return { text: textWithoutCitations, citations };
  }
  
  return { text: content, citations: [] };
}
