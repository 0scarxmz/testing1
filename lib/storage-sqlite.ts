import type { Note, Relationship, NoteSearchResult } from '@/types/note';
import { generateUUID } from './utils';

// Type guard to check if desktopAPI is available
function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).desktopAPI !== 'undefined';
}

// Convert SQLite note format to Note interface
function sqliteToNote(sqliteNote: any): Note {
  // Defensively parse tags - always ensure we return an array
  let tags: string[] = [];
  if (sqliteNote.tags) {
    try {
      const parsed = JSON.parse(sqliteNote.tags);
      tags = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Failed to parse tags from SQLite, using empty array:', e);
      tags = [];
    }
  }

  // Defensively parse embedding
  let embedding: number[] | null = null;
  if (sqliteNote.embedding) {
    try {
      const parsed = JSON.parse(sqliteNote.embedding);
      embedding = Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.warn('Failed to parse embedding from SQLite:', e);
      embedding = null;
    }
  }

  return {
    id: sqliteNote.id,
    title: sqliteNote.title || '',
    content: sqliteNote.content || '',
    tags,
    createdAt: sqliteNote.createdAt ?? sqliteNote.created_at ?? Date.now(),
    updatedAt: sqliteNote.updatedAt ?? sqliteNote.updated_at ?? Date.now(),
    embedding,
  };
}

// Convert Note interface to SQLite format
function noteToSqlite(note: Partial<Note>): any {
  // Ensure tags are always an array before stringifying
  const tagsArray = Array.isArray(note.tags) ? note.tags : [];
  
  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    tags: JSON.stringify(tagsArray),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    embedding: note.embedding && Array.isArray(note.embedding) ? JSON.stringify(note.embedding) : null,
  };
}

export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  const id = generateUUID();
  const now = Date.now();

  // Ensure tags are always an array (default to empty array if not provided)
  const noteWithDefaults = {
    ...note,
    tags: Array.isArray(note.tags) ? note.tags : [],
    embedding: note.embedding || null,
  };

  const sqliteNote = noteToSqlite({
    ...noteWithDefaults,
    id,
    createdAt: now,
    updatedAt: now,
  });

  await desktopAPI.createNote(sqliteNote);
  
  return {
    ...noteWithDefaults,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getNote(id: string): Promise<Note | undefined> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  const sqliteNote = await desktopAPI.getNote(id);
  
  if (!sqliteNote) {
    return undefined;
  }

  return sqliteToNote(sqliteNote);
}

export async function getAllNotes(): Promise<Note[]> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  const sqliteNotes = await desktopAPI.getNotes();
  
  return sqliteNotes.map(sqliteToNote);
}

export async function updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  
  // Get existing note first
  const existing = await getNote(id);
  if (!existing) {
    throw new Error(`Note with id ${id} not found`);
  }

  const updated: Note = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  const sqliteNote = noteToSqlite(updated);
  await desktopAPI.updateNote(id, {
    title: sqliteNote.title,
    content: sqliteNote.content,
    tags: sqliteNote.tags,
    updatedAt: sqliteNote.updatedAt,
    embedding: sqliteNote.embedding,
  });

  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  await desktopAPI.deleteNote(id);
}

export async function getNotesByTag(tag: string): Promise<Note[]> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  const sqliteNotes = await desktopAPI.getNotesByTag(tag);
  
  return sqliteNotes.map(sqliteToNote);
}

export async function searchNotesByText(query: string): Promise<Note[]> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  const sqliteNotes = await desktopAPI.searchNotesByText(query);
  
  return sqliteNotes.map(sqliteToNote);
}

export async function getAllTags(): Promise<string[]> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }
  return await desktopAPI.getAllTags();
}

// Relationship operations (placeholder for now)
export async function createRelationship(relationship: Omit<Relationship, 'id' | 'createdAt'>): Promise<Relationship> {
  // TODO: Implement when relationships table is added
  throw new Error('Relationships not yet implemented in SQLite');
}

export async function getNoteRelationships(noteId: string): Promise<Relationship[]> {
  // TODO: Implement when relationships table is added
  return [];
}

/**
 * Semantic search using vector embeddings and cosine similarity
 */
export async function searchNotesSemantic(query: string): Promise<NoteSearchResult[]> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    throw new Error('desktopAPI is not available');
  }

  try {
    // Generate embedding for query using desktopAPI
    const queryEmbedding = await desktopAPI.generateEmbedding(query);
    
    // Perform semantic search using desktopAPI
    const rankedResults = await desktopAPI.semanticSearch(queryEmbedding);
    
    // Convert SQLite results to Note interface
    const results: NoteSearchResult[] = rankedResults.map((result: any) => ({
      note: sqliteToNote(result),
      score: result.score,
    }));

    return results;
  } catch (error) {
    console.error('Semantic search failed:', error);
    // If embedding generation fails (e.g., no API key), return empty results
    return [];
  }
}

/**
 * Get related notes based on embedding similarity
 */
export async function getRelatedNotes(noteId: string, limit: number = 3): Promise<NoteSearchResult[]> {
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  try {
    const currentNote = await getNote(noteId);
    
    if (!currentNote || !currentNote.embedding) {
      return [];
    }

    const allNotes = await getAllNotes();
    const otherNotes = allNotes.filter(
      note => note.id !== noteId && note.embedding !== null && note.embedding !== undefined
    );

    if (otherNotes.length === 0) {
      return [];
    }

    const results: NoteSearchResult[] = otherNotes.map(note => {
      const similarity = cosineSimilarity(currentNote.embedding!, note.embedding!);
      return {
        note,
        score: similarity,
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  } catch (error) {
    console.error('Failed to get related notes:', error);
    return [];
  }
}

