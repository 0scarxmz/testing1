import { getDB } from './db';
import type { Note, Relationship, NoteSearchResult } from '@/types/note';
import { generateEmbedding, cosineSimilarity, isEmbeddingAvailable } from './embeddings';
import { generateUUID } from './utils';

// Check if we're in Electron environment
function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).desktopAPI !== 'undefined';
}

// SQLite storage functions (only used in Electron)
// In Electron, we MUST use SQLite - never fall back to IndexedDB
async function useSqliteStorage() {
  if (!isElectron()) {
    return null; // Not in Electron, use IndexedDB
  }
  
  // Verify desktopAPI is actually available
  if (!(window as any).desktopAPI) {
    console.error('Electron detected but desktopAPI is not available. This should not happen.');
    throw new Error('desktopAPI not available in Electron environment');
  }
  
  try {
    const sqliteStorage = await import('./storage-sqlite');
    return sqliteStorage;
  } catch (e) {
    console.error('Failed to load SQLite storage:', e);
    // In Electron, we should never fall back to IndexedDB
    throw new Error('SQLite storage is required in Electron but failed to load');
  }
}

export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  // Ensure tags are always an array
  const noteWithTags = {
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : [],
  };

  // Use SQLite in Electron, IndexedDB in browser
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.createNote(noteWithTags);
  }

  const db = await getDB();
  const id = generateUUID();
  const now = Date.now();

  const newNote: Note = {
    ...noteWithTags,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('notes', newNote);
  return newNote;
}

export async function getNote(id: string): Promise<Note | undefined> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.getNote(id);
  }

  const db = await getDB();
  return db.get('notes', id);
}

export async function getAllNotes(): Promise<Note[]> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.getAllNotes();
  }

  const db = await getDB();
  return db.getAll('notes');
}

export async function updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.updateNote(id, updates);
  }

  const db = await getDB();
  const existing = await db.get('notes', id);

  if (!existing) {
    throw new Error(`Note with id ${id} not found`);
  }

  const updated: Note = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  await db.put('notes', updated);
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.deleteNote(id);
  }

  const db = await getDB();
  await db.delete('notes', id);
  
  // Also delete all relationships involving this note
  const tx = db.transaction('relationships', 'readwrite');
  const relationshipsStore = tx.store;
  const sourceIndex = relationshipsStore.index('by-source');
  const targetIndex = relationshipsStore.index('by-target');

  const sourceRelations = await sourceIndex.getAll(id);
  const targetRelations = await targetIndex.getAll(id);

  for (const rel of [...sourceRelations, ...targetRelations]) {
    await relationshipsStore.delete(rel.id);
  }

  await tx.done;
}

export async function getNotesByTag(tag: string): Promise<Note[]> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.getNotesByTag(tag);
  }

  const db = await getDB();
  const index = db.transaction('notes').store.index('by-tag');
  return index.getAll(tag);
}

export async function searchNotesByText(query: string): Promise<Note[]> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.searchNotesByText(query);
  }

  const db = await getDB();
  const allNotes = await db.getAll('notes');
  const lowerQuery = query.toLowerCase();

  return allNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// Relationship operations
export async function createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt'>): Promise<Relationship> {
  const db = await getDB();
  const id = generateUUID();
  const now = Date.now();

  const newRelationship: Relationship = {
    ...relationship,
    id,
    createdAt: now,
  };

  await db.put('relationships', newRelationship);
  return newRelationship;
}

export async function getNoteRelationships(noteId: string): Promise<Relationship[]> {
  const db = await getDB();
  const tx = db.transaction('relationships');
  const sourceIndex = tx.store.index('by-source');
  const targetIndex = tx.store.index('by-target');

  const sourceRelations = await sourceIndex.getAll(noteId);
  const targetRelations = await targetIndex.getAll(noteId);

  return [...sourceRelations, ...targetRelations];
}

export async function getAllTags(): Promise<string[]> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.getAllTags();
  }

  const db = await getDB();
  const allNotes = await db.getAll('notes');
  const tagSet = new Set<string>();
  
  allNotes.forEach(note => {
    note.tags.forEach(tag => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
}

/**
 * Semantic search using vector embeddings and cosine similarity
 * @param query - Search query text
 * @returns Array of notes with similarity scores, sorted by relevance
 */
export async function searchNotesSemantic(query: string): Promise<NoteSearchResult[]> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.searchNotesSemantic(query);
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  // Check if embeddings are available before attempting to generate
  if (!isEmbeddingAvailable()) {
    console.warn('Semantic search unavailable: OpenAI API key not configured');
    return [];
  }

  try {
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);

    // Get all notes with embeddings
    const db = await getDB();
    const allNotes = await db.getAll('notes');
    const notesWithEmbeddings = allNotes.filter(note => note.embedding !== null && note.embedding !== undefined);

    if (notesWithEmbeddings.length === 0) {
      console.warn('Semantic search: No notes with embeddings found. Save some notes first to generate embeddings.');
      return [];
    }

    console.log(`Semantic search: Found ${notesWithEmbeddings.length} notes with embeddings out of ${allNotes.length} total notes`);

    // Calculate similarity scores
    const results: NoteSearchResult[] = notesWithEmbeddings.map(note => {
      const similarity = cosineSimilarity(queryEmbedding, note.embedding!);
      return {
        note,
        score: similarity,
      };
    });

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
  } catch (error) {
    console.error('Semantic search failed:', error);
    return [];
  }
}

/**
 * Get related notes based on embedding similarity
 * @param noteId - ID of the note to find related notes for
 * @param limit - Maximum number of related notes to return (default: 3)
 * @returns Array of related notes with similarity scores
 */
export async function getRelatedNotes(noteId: string, limit: number = 3): Promise<NoteSearchResult[]> {
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    return sqliteStorage.getRelatedNotes(noteId, limit);
  }

  try {
    // Get current note
    const currentNote = await getNote(noteId);
    
    if (!currentNote || !currentNote.embedding) {
      return [];
    }

    // Get all other notes with embeddings
    const db = await getDB();
    const allNotes = await db.getAll('notes');
    const otherNotes = allNotes.filter(
      note => note.id !== noteId && note.embedding !== null && note.embedding !== undefined
    );

    if (otherNotes.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const results: NoteSearchResult[] = otherNotes.map(note => {
      const similarity = cosineSimilarity(currentNote.embedding!, note.embedding!);
      return {
        note,
        score: similarity,
      };
    });

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Return top N results
    return results.slice(0, limit);
  } catch (error) {
    console.error('Failed to get related notes:', error);
    return [];
  }
}

