import { Client, Databases, Storage } from 'node-appwrite';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// Helper function untuk membersihkan teks
function cleanText(text) {
  if (!text) return "";
  return text
    .replace(/\s+/g, " ") // Hapus spasi berlebih
    .replace(/[^\x20-\x7E\n\r]/g, "") // Hapus karakter non-printable
    .trim()
    .slice(0, 100000); // Limit 100k karakter agar database tidak berat
}

export default async ({ req, res, log, error }) => {
  // 1. Inisialisasi Client Appwrite
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // API Key khusus (bukan dari user)

  const databases = new Databases(client);
  const storage = new Storage(client);

  // Environment Variables untuk ID Database/Bucket
  const DATABASE_ID = process.env.DATABASE_ID;
  const COLLECTION_ID = 'documents'; // Nama collection ID kamu
  const BUCKET_ID = 'vault-documents'; // Nama bucket ID kamu

  try {
    // 2. Parse Input dari Request
    // Kita asumsikan request dikirim sebagai JSON string di body
    let payload;
    try {
        payload = JSON.parse(req.body);
    } catch (e) {
        // Jika body kosong atau error, cek apakah trigger dari Event
        payload = {};
    }

    const { documentId, fileId } = payload;

    if (!documentId || !fileId) {
      return res.json({ error: "Missing documentId or fileId" }, 400);
    }

    log(`Processing document: ${documentId}, file: ${fileId}`);

    // 3. Download File dari Storage
    // getFileDownload mengembalikan ArrayBuffer (binary data)
    const fileBuffer = await storage.getFileDownload(BUCKET_ID, fileId);
    
    // Dapatkan metadata file untuk cek mime-type
    const fileMeta = await storage.getFile(BUCKET_ID, fileId);
    const mimeType = fileMeta.mimeType;

    let extractedText = "";

    // 4. Proses Ekstraksi Berdasarkan Tipe File
    if (mimeType === 'application/pdf') {
        log("Parsing PDF...");
        const buffer = Buffer.from(fileBuffer);
        const data = await pdf(buffer);
        extractedText = data.text;
    } else if (mimeType.startsWith('text/')) {
        log("Parsing Text...");
        // Konversi buffer ke string utf-8
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(fileBuffer);
    } else {
        // Fallback untuk tipe lain
        log("Unknown type, trying text decode...");
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(fileBuffer);
    }

    // 5. Bersihkan Teks
    const cleanedText = cleanText(extractedText);
    
    // Validasi hasil ekstraksi
    if (cleanedText.length < 50 && mimeType === 'application/pdf') {
        // Jika hasil PDF kosong (mungkin gambar scan), beri pesan default
        log("Text extraction yielded minimal results.");
    }

    // 6. Update Database
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID,
        documentId,
        {
            extracted_text: cleanedText,
            status: 'ready',
            error_message: null // Clear error messsage if any
        }
    );

    log("Document updated successfully.");

    return res.json({
      success: true,
      extractedLength: cleanedText.length,
      preview: cleanedText.slice(0, 100) + "..."
    });

  } catch (err) {
    error("Processing Failed: " + err.message);

    // Update status dokumen jadi error jika gagal
    if (req.body) {
        try {
            const { documentId } = JSON.parse(req.body);
            if (documentId) {
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    documentId,
                    {
                        status: 'error',
                        error_message: err.message
                    }
                );
            }
        } catch (dbErr) {
            error("Failed to update error status: " + dbErr.message);
        }
    }

    return res.json({ error: err.message }, 500);
  }
};