-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-documents',
  'vault-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create documents table to store metadata and extracted content
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  extracted_text TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (no auth implemented yet)
CREATE POLICY "Allow public read on documents"
ON public.documents FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on documents"
ON public.documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on documents"
ON public.documents FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on documents"
ON public.documents FOR DELETE
USING (true);

-- Storage policies for documents bucket
CREATE POLICY "Allow public uploads to vault-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vault-documents');

CREATE POLICY "Allow public read from vault-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault-documents');

CREATE POLICY "Allow public delete from vault-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'vault-documents');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_documents_updated_at();