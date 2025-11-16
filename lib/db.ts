import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface NotesDB extends DBSchema {
  notes: {
    key: string;
    value: {
      id: string;
      title: string;
      content: string;
      tags: string[];
      createdAt: number;
      updatedAt: number;
      embedding?: number[];
    };
    indexes: { 'by-created': number; 'by-updated': number; 'by-tag': string };
  };
  relationships: {
    key: string;
    value: {
      id: string;
      sourceNoteId: string;
      targetNoteId: string;
      type: 'related' | 'references' | 'similar';
      strength: number;
      createdAt: number;
    };
    indexes: { 'by-source': string; 'by-target': string };
  };
}

let dbInstance: IDBPDatabase<NotesDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NotesDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<NotesDB>('notes-db', 1, {
    upgrade(db) {
      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-created', 'createdAt');
        notesStore.createIndex('by-updated', 'updatedAt');
        notesStore.createIndex('by-tag', 'tags', { multiEntry: true });
      }

      // Relationships store
      if (!db.objectStoreNames.contains('relationships')) {
        const relationshipsStore = db.createObjectStore('relationships', {
          keyPath: 'id',
        });
        relationshipsStore.createIndex('by-source', 'sourceNoteId');
        relationshipsStore.createIndex('by-target', 'targetNoteId');
      }
    },
  });

  return dbInstance;
}

