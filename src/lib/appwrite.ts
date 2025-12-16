import { Client, Account, Databases, Storage, Functions } from 'appwrite';

// Konfigurasi Environment Variables
// Pastikan kamu update .env kamu dengan variabel ini
const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Helper constants agar tidak hardcode ID di mana-mana
export const APPWRITE_CONFIG = {
  ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  DATABASE_ID: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  BUCKET_ID: import.meta.env.VITE_APPWRITE_BUCKET_ID,
  FUNCTIONS: {
    PROCESS_DOCUMENT: import.meta.env.VITE_APPWRITE_FUNCTION_PROCESS_DOCUMENT,
  },
  COLLECTIONS: {
    DOCUMENTS: '6941248300355cfdfaa9', // Gunakan ID collection, bukan nama jika berbeda
    CONVERSATIONS: '69412719003837869761',
    CHAT_MESSAGES: '6941290e0023b0f02f2b',
  },
};

export { client };