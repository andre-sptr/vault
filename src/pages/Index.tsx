import { useState } from "react";
import { Sidebar } from "@/components/vault/Sidebar";
import { DocumentUpload } from "@/components/vault/DocumentUpload";
import { DocumentPanel } from "@/components/vault/DocumentPanel";
import { ChatPanel } from "@/components/vault/ChatPanel";
import { useDocuments } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  
  // 1. Hapus 'refreshDocument' dari sini
  const { documents, isLoading, deleteDocument } = useDocuments();
  
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showSidebar, setShowSidebar] = useState(!isMobile);

  const handleDocumentSelect = (id: string) => {
    setSelectedDocumentId(id);
    if (isMobile) setShowSidebar(false);
  };

  const handleUploadComplete = () => {
    // 2. Hapus baris ini: refreshDocument(); 
    // React Query di useDocuments sudah otomatis melakukan refresh saat upload sukses.
    console.log("Upload complete, list updated automatically via React Query");
  };

  const handleDeleteDocument = async (id: string) => {
    // Cari dokumen lengkap berdasarkan ID untuk pass ke deleteDocument
    const docToDelete = documents?.find(d => d.id === id); // Appwrite return .id (mapped from $id)
    if (docToDelete) {
        await deleteDocument.mutateAsync(docToDelete);
        if (selectedDocumentId === id) {
            setSelectedDocumentId(null);
        }
    }
  };

  const selectedDocument = documents?.find((d) => d.id === selectedDocumentId);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        documents={documents || []}
        selectedId={selectedDocumentId}
        onSelect={handleDocumentSelect}
        onDelete={handleDeleteDocument}
        isOpen={showSidebar}
        onToggle={() => setShowSidebar(!showSidebar)}
        user={user}
        isLoading={isLoading}
      />

      <main className={`flex-1 flex flex-col transition-all duration-300 ${
        showSidebar && !isMobile ? "ml-0" : "ml-0"
      }`}>
        <div className="h-14 border-b flex items-center px-4 justify-between bg-card">
          <div className="flex items-center gap-2">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 hover:bg-accent rounded-md"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                >
                  <path
                    d="M1.5 3C1.22386 3 1 3.22386 1 3.5C1 3.77614 1.22386 4 1.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H1.5ZM1 7.5C1 7.22386 1.22386 7 1.5 7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H1.5C1.22386 8 1 7.77614 1 7.5ZM1 11.5C1 11.2239 1.22386 11 1.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H1.5C1.22386 12 1 11.7761 1 11.5Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            <h1 className="font-semibold text-lg truncate">
              {selectedDocument ? selectedDocument.filename : "Vault"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <DocumentUpload onUploadComplete={handleUploadComplete} onClose={function (): void {
              throw new Error("Function not implemented.");
            } } />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex relative">
          {selectedDocument ? (
            <>
              <div className={`flex-1 transition-all duration-300 ${isMobile ? 'hidden' : 'block'}`}>
                <DocumentPanel document={selectedDocument} isOpen={false} onClose={function (): void {
                  throw new Error("Function not implemented.");
                } } />
              </div>
              <div className={`${isMobile ? 'w-full' : 'w-[400px] border-l'} bg-background`}>
                <ChatPanel documentId={selectedDocument.id} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
              <div className="max-w-md">
                <h2 className="text-2xl font-bold mb-4 text-foreground">Welcome to Vault</h2>
                <p className="mb-8">
                  Upload a document to start chatting, or select an existing document from the sidebar.
                </p>
                <div className="flex justify-center">
                  <DocumentUpload onUploadComplete={handleUploadComplete} onClose={function (): void {
                      throw new Error("Function not implemented.");
                    } } />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;