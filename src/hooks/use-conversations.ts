import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Citation {
  id: number;
  page: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  document_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useConversations(documentId?: string | null) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Fetch conversations for the current document
  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    const query = supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });
    
    if (documentId) {
      query.eq("document_id", documentId);
    }

    const { data, error } = await query;
    if (!error && data) {
      setConversations(data);
    }
    setIsLoadingConversations(false);
  }, [documentId]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(
        data.map((m) => ({
          ...m,
          role: m.role as "user" | "assistant",
          citations: (m.citations as unknown as Citation[]) || undefined,
        }))
      );
    }
    setIsLoading(false);
  }, []);

  // Select a conversation
  const selectConversation = useCallback(
    async (conversation: Conversation) => {
      setCurrentConversation(conversation);
      await fetchMessages(conversation.id);
    },
    [fetchMessages]
  );

  // Create a new conversation
  const createConversation = useCallback(
    async (docId?: string | null, title?: string): Promise<Conversation | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          document_id: docId || null,
          title: title || "New Conversation",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return null;
      }

      setCurrentConversation(data);
      setMessages([]);
      setConversations((prev) => [data, ...prev]);
      return data;
    },
    [user]
  );

  // Add a message to the current conversation
  const addMessage = useCallback(
    async (
      role: "user" | "assistant",
      content: string,
      citations?: Citation[]
    ): Promise<ChatMessage | null> => {
      if (!currentConversation) return null;

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: currentConversation.id,
          role,
          content,
          citations: JSON.parse(JSON.stringify(citations || [])),
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding message:", error);
        return null;
      }

      const newMessage: ChatMessage = {
        ...data,
        role: data.role as "user" | "assistant",
        citations: (data.citations as unknown as Citation[]) || undefined,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Update conversation title if first user message
      if (role === "user" && messages.length === 0) {
        const newTitle = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        await supabase
          .from("conversations")
          .update({ title: newTitle })
          .eq("id", currentConversation.id);
        
        setCurrentConversation((prev) => prev ? { ...prev, title: newTitle } : null);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConversation.id ? { ...c, title: newTitle } : c
          )
        );
      }

      return newMessage;
    },
    [currentConversation, messages.length]
  );

  // Rename a conversation
  const renameConversation = useCallback(
    async (id: string, newTitle: string): Promise<boolean> => {
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) return false;

      const { error } = await supabase
        .from("conversations")
        .update({ title: trimmedTitle })
        .eq("id", id);

      if (error) {
        console.error("Error renaming conversation:", error);
        return false;
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmedTitle } : c))
      );
      if (currentConversation?.id === id) {
        setCurrentConversation((prev) => prev ? { ...prev, title: trimmedTitle } : null);
      }
      return true;
    },
    [currentConversation]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting conversation:", error);
        return false;
      }

      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
      return true;
    },
    [currentConversation]
  );

  // Clear current conversation
  const clearConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  // Fetch conversations on mount and when documentId changes
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Clear conversation when document changes
  useEffect(() => {
    clearConversation();
  }, [documentId, clearConversation]);

  return {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isLoadingConversations,
    selectConversation,
    createConversation,
    addMessage,
    clearConversation,
    deleteConversation,
    renameConversation,
    fetchConversations,
    setMessages,
  };
}
