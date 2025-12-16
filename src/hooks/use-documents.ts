import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Document {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  extracted_text: string | null;
  status: string;
  created_at: string;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
    } else {
      setDocuments(data || []);
      // Auto-select first document if none selected
      if (!selectedDocument && data && data.length > 0) {
        setSelectedDocument(data[0]);
      }
    }
    setIsLoading(false);
  };

  const addDocument = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedDocument(doc);
  };

  const selectDocument = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const refreshDocument = async (id: string) => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? data : doc))
      );
      if (selectedDocument?.id === id) {
        setSelectedDocument(data);
      }
    }
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    // Get document to find file path
    const doc = documents.find((d) => d.id === id);
    
    // Delete from storage if file exists
    if (doc?.file_path) {
      await supabase.storage.from("vault-documents").remove([doc.file_path]);
    }

    // Delete from database (this will cascade to conversations due to ON DELETE SET NULL)
    const { error } = await supabase.from("documents").delete().eq("id", id);

    if (error) {
      console.error("Error deleting document:", error);
      return false;
    }

    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocument?.id === id) {
      setSelectedDocument(null);
    }
    return true;
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    isLoading,
    selectedDocument,
    addDocument,
    selectDocument,
    refreshDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}
