import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface DocumentUploadProps {
  onUploadComplete: (document: { id: string; filename: string; status: string }) => void;
  onClose: () => void;
}

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error";

export function DocumentUpload({ onUploadComplete, onClose }: DocumentUploadProps) {
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const processFile = async (file: File) => {
    if (!user) {
      setErrorMessage("You must be logged in to upload documents");
      setUploadState("error");
      return;
    }

    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Please upload a PDF, TXT, DOC, or DOCX file");
      setUploadState("error");
      return;
    }

    if (file.size > maxSize) {
      setErrorMessage("File size must be less than 50MB");
      setUploadState("error");
      return;
    }

    setSelectedFile(file);
    setUploadState("uploading");
    setProgress(0);

    try {
      // Generate unique file path with user ID for organization
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

      // Upload to storage
      setProgress(20);
      const { error: uploadError } = await supabase.storage
        .from("vault-documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(50);

      // Create document record
      const { data: docRecord, error: dbError } = await supabase
        .from("documents")
        .insert({
          filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: "processing",
          user_id: user.id,
        })
        .select()
        .single();

      if (dbError || !docRecord) {
        throw new Error(`Database error: ${dbError?.message}`);
      }

      setProgress(70);
      setUploadState("processing");

      // Trigger document processing
      const { error: processError } = await supabase.functions.invoke("process-document", {
        body: { documentId: docRecord.id, filePath },
      });

      if (processError) {
        console.error("Process error:", processError);
        // Don't fail completely - the document was uploaded
        toast({
          title: "Processing Notice",
          description: "Document uploaded. Text extraction may be limited for this file type.",
        });
      }

      setProgress(100);
      setUploadState("complete");

      // Notify parent
      setTimeout(() => {
        onUploadComplete({
          id: docRecord.id,
          filename: file.name,
          status: "ready",
        });
      }, 1000);

    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Upload failed");
      setUploadState("error");
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const resetUpload = () => {
    setUploadState("idle");
    setProgress(0);
    setSelectedFile(null);
    setErrorMessage("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg glass rounded-2xl border border-border/50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/30 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {uploadState === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium mb-1">
                    Drag & drop your document
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>Select File</span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported: PDF, TXT, DOC, DOCX (max 50MB)
                  </p>
                </div>
              </motion.div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
                <p className="text-foreground font-medium mb-1">
                  {uploadState === "uploading" ? "Uploading..." : "Processing document..."}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedFile?.name}
                </p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
              </motion.div>
            )}

            {uploadState === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-foreground font-medium mb-1">Upload Complete!</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile?.name} is ready for analysis
                </p>
              </motion.div>
            )}

            {uploadState === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-foreground font-medium mb-1">Upload Failed</p>
                <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
                <Button onClick={resetUpload} variant="outline">
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
