/**
 * TypeScript definitions for Electron desktopAPI
 * This API is exposed via contextBridge in electron/preload.js
 */
export interface DesktopAPI {
  // Database operations
  getNotes: () => Promise<any[]>;
  getNote: (id: string) => Promise<any | undefined>;
  createNote: (data: {
    id: string;
    title: string;
    content: string;
    tags: string; // JSON string
    createdAt: number;
    updatedAt: number;
    embedding: string | null; // JSON string or null
  }) => Promise<void>;
  updateNote: (id: string, updates: {
    title?: string;
    content?: string;
    tags?: string;
    updatedAt?: number;
    embedding?: string | null;
  }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNotesByTag: (tag: string) => Promise<any[]>;
  searchNotesByText: (query: string) => Promise<any[]>;
  getAllTags: () => Promise<string[]>;
  // Embedding operations
  generateEmbedding: (text: string) => Promise<number[]>;
  semanticSearch: (queryEmbedding: number[]) => Promise<any[]>;
}

declare global {
  interface Window {
    desktopAPI?: DesktopAPI;
  }
}

