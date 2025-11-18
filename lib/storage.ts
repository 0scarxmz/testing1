import { getDB } from './db';
import type { Note, Relationship } from '@/types/note';

export async function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = Date.now();

  const newNote: Note = {
    ...note,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('notes', newNote);
  return newNote;
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  return db.getAll('notes');
}

export async function updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<Note> {
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
  const db = await getDB();
  const index = db.transaction('notes').store.index('by-tag');
  return index.getAll(tag);
}

export async function searchNotesByText(query: string): Promise<Note[]> {
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
  const id = crypto.randomUUID();
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
  const db = await getDB();
  const allNotes = await db.getAll('notes');
  const tagSet = new Set<string>();
  
  allNotes.forEach(note => {
    note.tags.forEach(tag => tagSet.add(tag));
  });
  
  return Array.from(tagSet).sort();
}

