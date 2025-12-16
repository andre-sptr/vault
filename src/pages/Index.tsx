import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRightOpen, PanelRightClose, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/vault/Sidebar";
import { ChatPanel } from "@/components/vault/ChatPanel";
import { DocumentPanel } from "@/components/vault/DocumentPanel";
import { DocumentUpload } from "@/components/vault/DocumentUpload";
import { DocumentSearch } from "@/components/vault/DocumentSearch";
import { useDocuments, Document } from "@/hooks/use-documents";
import { useConversations, Citation, Conversation } from "@/hooks/use-conversations";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAuth } from "@/hooks/use-auth";
import { streamVaultChat, parseCitations } from "@/lib/api/vault-chat";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);
  const [isDocPanelOpen, setIsDocPanelOpen] = useState(true);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const { toast } = useToast();
  
  const { 
    documents, 
    isLoading: isLoadingDocuments,
    selectedDocument, 
    selectDocument, 
    refreshDocument,
    deleteDocument,
  } = useDocuments();

  const {
    conversations,
    currentConversation,
    messages,
    isLoadingConversations,
    selectConversation,
    createConversation,
    addMessage,
    clearConversation,
    deleteConversation,
    renameConversation,
  } = useConversations(selectedDocument?.id);

  const handleCitationClick = (citation: Citation) => {
    setActiveCitation(citation);
    setIsDocPanelOpen(true);
  };

  const handleUploadComplete = async (doc: { id: string; filename: string; status: string }) => {
    setShowUpload(false);
    setTimeout(() => refreshDocument(doc.id), 2000);
  };

  const handleNewChat = () => {
    clearConversation();
  };

  const handleSearchSelect = (doc: Document) => {
    selectDocument(doc);
    setShowSearch(false);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    // Find the document for this conversation
    if (conv.document_id) {
      const doc = documents.find(d => d.id === conv.document_id);
      if (doc) {
        selectDocument(doc);
      }
    }
    await selectConversation(conv);
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedDocument) {
      toast({
        title: "No document selected",
        description: "Please upload or select a document first.",
        variant: "destructive",
      });
      return;
    }

    // Create conversation if none exists
    let conv = currentConversation;
    if (!conv) {
      conv = await createConversation(selectedDocument.id, content.slice(0, 50));
      if (!conv) {
        toast({
          title: "Error",
          description: "Failed to create conversation.",
          variant: "destructive",
        });
        return;
      }
    }

    // Add user message
    await addMessage("user", content);
    setIsTyping(true);
    setStreamingContent("");

    // Build message history for context
    const messageHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content },
    ];

    let fullResponse = "";

    await streamVaultChat({
      messages: messageHistory,
      documentContext: { 
        filename: selectedDocument.filename,
        extractedText: selectedDocument.extracted_text || undefined,
      },
      onDelta: (delta) => {
        fullResponse += delta;
        setStreamingContent(fullResponse);
      },
      onDone: async () => {
        const { text, citations } = parseCitations(fullResponse);
        await addMessage("assistant", text, citations.length > 0 ? citations : undefined);
        setStreamingContent("");
        setIsTyping(false);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        setIsTyping(false);
        setStreamingContent("");
      },
    });
  }, [selectedDocument, currentConversation, messages, createConversation, addMessage, toast]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: handleNewChat,
    onUpload: () => setShowUpload(true),
    onSearch: () => setShowSearch(true),
  });

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar 
        documents={documents}
        selectedDocument={selectedDocument}
        onSelectDocument={selectDocument}
        onUploadClick={() => setShowUpload(true)}
        onNewChat={handleNewChat}
        onSearchClick={() => setShowSearch(true)}
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteDocument={deleteDocument}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        userEmail={user.email}
        onSignOut={signOut}
        isLoadingDocuments={isLoadingDocuments}
        isLoadingConversations={isLoadingConversations}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Chat Panel */}
        <ChatPanel 
          onCitationClick={handleCitationClick} 
          selectedDocument={selectedDocument}
          onUploadClick={() => setShowUpload(true)}
          messages={messages}
          currentConversation={currentConversation}
          onSendMessage={handleSendMessage}
          isTyping={isTyping}
          streamingContent={streamingContent}
        />

        {/* Toggle Button for Document Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-4 right-4 z-10"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDocPanelOpen(!isDocPanelOpen)}
            className="w-10 h-10 rounded-xl glass hover:bg-primary/10 hover:text-primary transition-all"
          >
            {isDocPanelOpen ? (
              <PanelRightClose className="w-5 h-5" />
            ) : (
              <PanelRightOpen className="w-5 h-5" />
            )}
          </Button>
        </motion.div>

        {/* Right Document Panel */}
        <DocumentPanel
          isOpen={isDocPanelOpen}
          onClose={() => setIsDocPanelOpen(false)}
          highlightedText={activeCitation?.text}
          document={selectedDocument}
        />
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <DocumentUpload 
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <DocumentSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectDocument={handleSearchSelect}
      />
    </div>
  );
};

export default Index;
