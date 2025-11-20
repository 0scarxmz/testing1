import type { Note, Relationship, NoteSearchResult } from '@/types/note';
import { generateUUID } from './utils';
import { cosineSimilarity } from './embeddings';

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
  
  // Handle embedding: validate and stringify if it's a valid array
  let embedding: string | null = null;
  if (note.embedding !== null && note.embedding !== undefined) {
    if (Array.isArray(note.embedding)) {
      // Validate embedding array
      if (note.embedding.length === 0) {
        console.warn('Warning: Empty embedding array in noteToSqlite for note', note.id);
        embedding = null;
      } else if (!note.embedding.every(n => typeof n === 'number')) {
        console.error('Error: Invalid embedding array - contains non-numbers in noteToSqlite for note', note.id);
        embedding = null;
      } else {
        embedding = JSON.stringify(note.embedding);
      }
    } else {
      console.error('Error: Embedding is not an array in noteToSqlite for note', note.id, typeof note.embedding);
      embedding = null;
    }
  }
  
  return {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    tags: JSON.stringify(tagsArray),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    embedding: embedding,
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

  // Log embedding info (only if embedding exists and is valid)
  if (sqliteNote.embedding) {
    try {
      const parsed = JSON.parse(sqliteNote.embedding);
      console.log('Creating note with embedding:', {
        noteId: id,
        hasEmbedding: true,
        embeddingLength: parsed.length,
        embeddingPreview: parsed.slice(0, 3),
        isValid: Array.isArray(parsed) && parsed.length > 0
      });
    } catch (e) {
      console.error('Error parsing embedding in createNote log:', e);
      console.log('Creating note with embedding:', {
        noteId: id,
        hasEmbedding: false,
        error: 'Invalid embedding JSON'
      });
    }
  } else {
    console.log('Creating note with embedding:', {
      noteId: id,
      hasEmbedding: false,
      reason: 'No embedding provided or invalid'
    });
  }

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
  console.log('Updating note with embedding:', {
    noteId: id,
    hasEmbedding: !!sqliteNote.embedding,
    embeddingLength: sqliteNote.embedding ? JSON.parse(sqliteNote.embedding).length : 0
  });
  
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
  console.log('[storage-sqlite] searchNotesSemantic called');
  
  if (!isElectron()) {
    throw new Error('SQLite storage only available in Electron');
  }

  if (!query || query.trim().length === 0) {
    return [];
  }

  const desktopAPI = window.desktopAPI;
  if (!desktopAPI) {
    console.error('[storage-sqlite] ERROR: desktopAPI is not available!');
    console.error('[storage-sqlite] window.desktopAPI:', window.desktopAPI);
    throw new Error('desktopAPI is not available. Make sure electron/preload.js is loading correctly.');
  }
  
  console.log('[storage-sqlite] desktopAPI is available, checking methods...');
  console.log('[storage-sqlite] generateEmbedding:', typeof desktopAPI.generateEmbedding);
  console.log('[storage-sqlite] semanticSearch:', typeof desktopAPI.semanticSearch);
  
  if (typeof desktopAPI.generateEmbedding !== 'function') {
    throw new Error('desktopAPI.generateEmbedding is not a function. Check electron/preload.js');
  }
  
  if (typeof desktopAPI.semanticSearch !== 'function') {
    throw new Error('desktopAPI.semanticSearch is not a function. Check electron/preload.js');
  }

  try {
    // Generate embedding for query using desktopAPI
    console.log('[Frontend] Generating embedding for query:', query);
    const queryEmbedding = await desktopAPI.generateEmbedding(query);
    console.log('[Frontend] Query embedding generated, length:', queryEmbedding.length);
    console.log('[Frontend] Query embedding preview:', queryEmbedding.slice(0, 3));
    
    // Perform semantic search using desktopAPI
    console.log('[Frontend] Performing semantic search with embedding...');
    const rankedResults = await desktopAPI.semanticSearch(queryEmbedding);
    console.log('[Frontend] Semantic search returned', rankedResults.length, 'results');
    
    if (rankedResults.length === 0) {
      console.warn('[Frontend] ⚠️  No results returned from semantic search');
      console.warn('[Frontend] This usually means no notes have embeddings yet.');
      console.warn('[Frontend] Try creating or updating a note to generate embeddings.');
      return [];
    }
    
    if (rankedResults.length > 0) {
      console.log('[Frontend] Top result:', rankedResults[0]?.title, 'score:', rankedResults[0]?.score?.toFixed(4));
    }
    
    // Convert SQLite results to Note interface
    // rankedResults are in format: { id, title, content, tags (string), embedding (array), score, ... }
    const results: NoteSearchResult[] = rankedResults.map((result: any) => {
      return {
        note: sqliteToNote(result),
        score: result.score || 0,
      };
    });

    console.log('[Frontend] Converted', results.length, 'results to NoteSearchResult format');
    console.log('[Frontend] First result note:', results[0]?.note?.title, 'id:', results[0]?.note?.id);
    return results;
  } catch (error) {
    console.error('[Frontend] Semantic search failed:', error);
    console.error('[Frontend] Error details:', error instanceof Error ? error.message : String(error));
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

