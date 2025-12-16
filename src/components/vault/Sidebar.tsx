import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, MessageSquare, Settings, ChevronRight, User, FileText, Upload, Loader2, Search, History, Trash2, Pencil, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Document } from "@/hooks/use-documents";
import { Conversation } from "@/hooks/use-conversations";
import { formatDistanceToNow } from "date-fns";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import logoImage from "@/assets/logo.jpg";

interface SidebarProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelectDocument: (doc: Document) => void;
  onUploadClick: () => void;
  onNewChat: () => void;
  onSearchClick: () => void;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conv: Conversation) => void;
  onDeleteDocument: (id: string) => Promise<boolean>;
  onDeleteConversation: (id: string) => Promise<boolean>;
  onRenameConversation: (id: string, newTitle: string) => Promise<boolean>;
  userEmail?: string;
  onSignOut?: () => void;
  isLoadingDocuments?: boolean;
  isLoadingConversations?: boolean;
}

export function Sidebar({ 
  documents, 
  selectedDocument, 
  onSelectDocument, 
  onUploadClick,
  onNewChat,
  onSearchClick,
  conversations,
  currentConversation,
  onSelectConversation,
  onDeleteDocument,
  onDeleteConversation,
  onRenameConversation,
  userEmail,
  onSignOut,
  isLoadingDocuments,
  isLoadingConversations,
}: SidebarProps) {
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteDocument = async () => {
    if (!deleteDocId) return;
    setIsDeleting(true);
    const success = await onDeleteDocument(deleteDocId);
    setIsDeleting(false);
    setDeleteDocId(null);
    if (success) {
      toast({ title: "Document deleted", description: "The document has been removed." });
    } else {
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvId) return;
    setIsDeleting(true);
    const success = await onDeleteConversation(deleteConvId);
    setIsDeleting(false);
    setDeleteConvId(null);
    if (success) {
      toast({ title: "Conversation deleted", description: "The chat has been removed." });
    } else {
      toast({ title: "Error", description: "Failed to delete conversation.", variant: "destructive" });
    }
  };
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-64 h-screen flex flex-col glass border-r border-border/50"
    >
      {/* Logo & New Chat */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img src={logoImage} alt="Vault Logo" className="w-9 h-9 rounded-lg object-contain glow-sm" />
          </div>
          <span className="text-xl font-semibold text-gradient">Vault</span>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={onNewChat}
            className="w-full justify-between gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50 transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Chat
            </span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-primary/30 bg-primary/5 px-1.5 font-mono text-[10px] font-medium text-primary/70">
              ⌘N
            </kbd>
          </Button>
          
          <div className="flex gap-2">
            <Button 
              onClick={onUploadClick}
              variant="outline"
              className="flex-1 justify-between gap-1 border-border/50 hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </span>
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/50 bg-secondary/50 px-1 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘U
              </kbd>
            </Button>
            
            <Button 
              onClick={onSearchClick}
              variant="outline"
              className="flex-1 justify-between gap-1 border-border/50 hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </span>
              <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border/50 bg-secondary/50 px-1 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Lists */}
      <ScrollArea className="flex-1 px-2 py-3">
        {/* Recent Conversations */}
        {(isLoadingConversations || conversations.length > 0) && (
          <div className="mb-4">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <History className="w-3 h-3" />
              Recent Chats
            </p>
            {isLoadingConversations ? (
              <div className="space-y-2 px-1">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                    <Skeleton className="w-7 h-7 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              conversations.slice(0, 5).map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={currentConversation?.id === conv.id}
                  onClick={() => onSelectConversation(conv)}
                  onDelete={() => setDeleteConvId(conv.id)}
                  onRename={(newTitle) => onRenameConversation(conv.id, newTitle)}
                />
              ))
            )}
          </div>
        )}

        {/* Documents */}
        <div className="mb-4">
          <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Documents
          </p>
          
          {isLoadingDocuments ? (
            <div className="space-y-2 px-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents yet</p>
              <p className="text-xs text-muted-foreground/70">Upload a PDF to get started</p>
            </div>
          ) : (
            documents.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                isSelected={selectedDocument?.id === doc.id}
                onClick={() => onSelectDocument(doc)}
                onDelete={() => setDeleteDocId(doc.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* User Profile & Theme */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors group">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="w-8 h-8 border border-border/50 flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {userEmail || "Guest"}
              </span>
              <span className="text-xs text-muted-foreground">Enterprise</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggle />
            {onSignOut && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8"
                onClick={onSignOut}
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialogs */}
      <DeleteConfirmDialog
        open={!!deleteDocId}
        onOpenChange={(open) => !open && setDeleteDocId(null)}
        title="Delete Document"
        description="This will permanently delete the document and remove it from storage. Any conversations linked to this document will be preserved but unlinked."
        onConfirm={handleDeleteDocument}
        isDeleting={isDeleting}
      />
      <DeleteConfirmDialog
        open={!!deleteConvId}
        onOpenChange={(open) => !open && setDeleteConvId(null)}
        title="Delete Conversation"
        description="This will permanently delete this conversation and all its messages. This action cannot be undone."
        onConfirm={handleDeleteConversation}
        isDeleting={isDeleting}
      />
    </motion.aside>
  );
}

function DocumentItem({ 
  document, 
  isSelected, 
  onClick,
  onDelete,
}: { 
  document: Document; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete: () => void;
}) {
  const isProcessing = document.status === "processing";
  const isError = document.status === "error";

  return (
    <div className="relative group">
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 relative overflow-hidden ${
          isSelected 
            ? "bg-primary/10 border border-primary/30" 
            : "hover:bg-secondary/60"
        }`}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-primary/5 to-transparent" />
        
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected ? "bg-primary/20" : "bg-secondary/50"
        }`}>
          {isProcessing ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <FileText className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${
            isSelected ? "text-primary" : "group-hover:text-foreground"
          } transition-colors`}>
            {document.filename}
          </p>
          <p className="text-xs text-muted-foreground">
            {isProcessing ? "Processing..." : isError ? "Error" : formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
          </p>
        </div>
      </motion.button>
      
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all z-10"
        title="Delete document"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ConversationItem({ 
  conversation, 
  isSelected, 
  onClick,
  onDelete,
  onRename,
}: { 
  conversation: Conversation; 
  isSelected: boolean; 
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => Promise<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editTitle.trim() && editTitle.trim() !== conversation.title) {
      await onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative group">
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={isEditing ? undefined : onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 relative overflow-hidden cursor-pointer ${
          isSelected 
            ? "bg-primary/10 border border-primary/30" 
            : "hover:bg-secondary/60"
        }`}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected ? "bg-primary/20" : "bg-secondary/50"
        }`}>
          <MessageSquare className={`w-3.5 h-3.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="h-6 text-sm py-0 px-1"
              maxLength={100}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p 
              className={`text-sm truncate ${
                isSelected ? "text-primary font-medium" : "group-hover:text-foreground"
              } transition-colors`}
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            >
              {conversation.title}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
          </p>
        </div>
      </motion.div>
      
      {!isEditing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="p-1.5 rounded-md hover:bg-primary/20 hover:text-primary transition-all"
            title="Rename conversation"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-md hover:bg-destructive/20 hover:text-destructive transition-all"
            title="Delete conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
