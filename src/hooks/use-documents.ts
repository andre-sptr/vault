import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, functions, APPWRITE_CONFIG, account } from "@/lib/appwrite";
import { ID, Query, Permission, Role } from "appwrite";
import { toast } from "sonner";

export interface Document {
  id: string;
  $id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'error';
  extracted_text?: string;
  created_at: string;
  error_message?: string;
}

export function useDocuments() {
  const queryClient = useQueryClient();

  // 1. Fetch Documents (List)
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      // Ambil dokumen, urutkan dari yang terbaru ($createdAt desc)
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.DOCUMENTS,
        [Query.orderDesc("$createdAt")]
      );
      
      // Mapping dari format Appwrite ke format aplikasi kita
      return response.documents.map(doc => ({
        ...doc,
        // Pastikan field sesuai interface, Appwrite pakai $id, $createdAt
        id: doc.$id, 
        created_at: doc.$createdAt 
      })) as unknown as Document[];
    },
  });

  // 2. Upload Document
  const addDocument = useMutation({
    mutationFn: async (file: File) => {
      try {
        // A. Cek User (Optional, untuk Owner ID)
        const user = await account.get();

        // B. Upload File ke Storage
        const fileUpload = await storage.createFile(
          APPWRITE_CONFIG.BUCKET_ID,
          ID.unique(),
          file,
          // Set permission agar bisa dibaca user lain (sesuai requestmu)
          [
             Permission.read(Role.users()),
             Permission.write(Role.user(user.$id)) // Hanya uploader yg bisa hapus/edit
          ]
        );

        // C. Simpan Metadata ke Database
        const documentData = {
          filename: file.name,
          file_path: fileUpload.$id, // Simpan ID File Storage di sini
          file_size: file.size,
          mime_type: file.type,
          status: 'processing',
          user_id: user.$id,
        };

        const doc = await databases.createDocument(
          APPWRITE_CONFIG.DATABASE_ID,
          APPWRITE_CONFIG.COLLECTIONS.DOCUMENTS,
          ID.unique(),
          documentData,
          [
             Permission.read(Role.users()),
             Permission.write(Role.user(user.$id))
          ]
        );

        // D. Panggil Function OCR (Process Document)
        // Kita panggil secara async (tidak perlu await sampai selesai agar UI cepat)
        functions.createExecution(
          APPWRITE_CONFIG.FUNCTIONS.PROCESS_DOCUMENT,
          JSON.stringify({
            documentId: doc.$id,
            fileId: fileUpload.$id
          })
        );

        return doc;

      } catch (error: any) {
        console.error("Upload failed:", error);
        throw new Error(error.message || "Failed to upload document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully. Processing started...");
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // 3. Delete Document
  const deleteDocument = useMutation({
    mutationFn: async (document: Document) => {
      // Hapus File Fisik di Storage
      if (document.file_path) {
          try {
              await storage.deleteFile(APPWRITE_CONFIG.BUCKET_ID, document.file_path);
          } catch (e) {
              console.warn("File storage not found or already deleted", e);
          }
      }
      
      // Hapus Metadata di Database
      await databases.deleteDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.COLLECTIONS.DOCUMENTS,
        document.$id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete document");
      console.error(error);
    }
  });

  return {
    documents,
    isLoading,
    addDocument,
    deleteDocument,
  };
}