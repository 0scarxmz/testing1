import { getDB } from './db';
import type { Note, Relationship, NoteSearchResult } from '@/types/note';
import { generateEmbedding, cosineSimilarity, isEmbeddingAvailable } from './embeddings';
import { generateUUID } from './utils';

// Check if we're in Electron environment
function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  // Check Electron flag first (set by preload via contextBridge)
  if ((window as any).__IS_ELECTRON__ === true) {
    return true;
  }
  // Fallback: check desktopAPI
  return typeof (window as any).desktopAPI !== 'undefined';
}

// SQLite storage functions (only used in Electron)
// In Electron, we MUST use SQLite - never fall back to IndexedDB
async function useSqliteStorage() {
  // Check if we're in a browser environment (not Electron)
  if (typeof window === 'undefined') {
    console.log('[storage] Server-side, cannot use SQLite');
    return null; // Server-side, OK
  }
  
  // Diagnostic: Log what's available
  console.log('[storage] === DIAGNOSTIC ===');
  console.log('[storage] window.__IS_ELECTRON__:', (window as any).__IS_ELECTRON__);
  console.log('[storage] window.desktopAPI:', typeof (window as any).desktopAPI);
  console.log('[storage] navigator.userAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
  console.log('[storage] window keys containing "electron" or "desktop":', 
    Object.keys(window).filter(k => k.toLowerCase().includes('electron') || k.toLowerCase().includes('desktop')));
  
  const isElectronFlag = (window as any).__IS_ELECTRON__ === true;
  const hasDesktopAPI = typeof (window as any).desktopAPI !== 'undefined';
  const userAgentHasElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
  
  // If we're in Electron (detected by flag OR userAgent) but desktopAPI is missing, FAIL LOUDLY
  if ((isElectronFlag || userAgentHasElectron) && !hasDesktopAPI) {
    console.error('[storage] ============================================');
    console.error('[storage] CRITICAL ERROR: Electron detected but desktopAPI missing!');
    console.error('[storage] Electron flag:', isElectronFlag);
    console.error('[storage] UserAgent has Electron:', userAgentHasElectron);
    console.error('[storage] desktopAPI available:', hasDesktopAPI);
    console.error('[storage] ============================================');
    throw new Error(
      'CRITICAL: Running in Electron but desktopAPI is not available.\n' +
      'This means the preload script failed to load or contextBridge failed.\n' +
      'Check:\n' +
      '1. Terminal output for [preload] messages\n' +
      '2. Terminal output for [main] Preload script path\n' +
      '3. electron/preload.js for syntax errors\n' +
      '4. electron/main.js preload path is correct'
    );
  }
  
  // If neither flag nor desktopAPI exists, check if we're actually in browser
  if (!isElectronFlag && !hasDesktopAPI && !userAgentHasElectron) {
    console.log('[storage] Browser environment detected, using IndexedDB');
    return null; // Browser, use IndexedDB
  }
  
  // Both exist, proceed with SQLite
  console.log('[storage] ✓ Electron detected, using SQLite storage');
  console.log('[storage] Electron flag:', isElectronFlag);
  console.log('[storage] desktopAPI available:', hasDesktopAPI);
  
  // Verify desktopAPI methods are available
  const desktopAPI = (window as any).desktopAPI;
  console.log('[storage] desktopAPI methods:', {
    hasGenerateEmbedding: typeof desktopAPI.generateEmbedding === 'function',
    hasSemanticSearch: typeof desktopAPI.semanticSearch === 'function',
    hasGetNotes: typeof desktopAPI.getNotes === 'function',
    allMethods: Object.keys(desktopAPI),
  });
  
  try {
    console.log('[storage] Importing storage-sqlite...');
    const sqliteStorage = await import('./storage-sqlite');
    console.log('[storage] SQLite storage imported successfully');
    return sqliteStorage;
  } catch (e) {
    console.error('[storage] Failed to load SQLite storage:', e);
    // In Electron, we should never fall back to IndexedDB
    throw new Error('SQLite storage is required in Electron but failed to load: ' + (e instanceof Error ? e.message : String(e)));
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
  console.log('[storage] searchNotesSemantic called, query:', query);
  
  // Try to use SQLite storage (Electron)
  const sqliteStorage = await useSqliteStorage();
  if (sqliteStorage) {
    console.log('[storage] Using SQLite storage for semantic search');
    return sqliteStorage.searchNotesSemantic(query);
  }

  // If useSqliteStorage returned null, check if we're in Electron
  // If we are, this is an error (should have thrown above)
  const isElectron = typeof window !== 'undefined' && 
    ((window as any).__IS_ELECTRON__ === true || 
     (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')));
  
  if (isElectron) {
    // This should never happen if useSqliteStorage is working correctly
    console.error('[storage] ERROR: In Electron but sqliteStorage is null!');
    console.error('[storage] This indicates a bug in useSqliteStorage() - it should have thrown an error');
    throw new Error('Semantic search failed: In Electron but SQLite storage unavailable. This is a bug.');
  }

  // Only use browser fallback if we're actually in a browser
  console.log('[storage] Using browser fallback for semantic search');
  
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

