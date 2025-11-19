import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { notes } from "./schema";
import { eq } from "drizzle-orm";
import { app } from "electron";
import path from "path";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

function getDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  // Get database path in user data directory (cross-platform)
  const dbPath = app && app.isReady() 
    ? path.join(app.getPath('userData'), 'notes.db')
    : path.join(process.cwd(), 'notes.db');
  
  sqliteInstance = new Database(dbPath);
  
  // Create table if it doesn't exist
  sqliteInstance.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      tags TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      embedding TEXT
    )
  `);
  
  dbInstance = drizzle(sqliteInstance, { schema: { notes } });
  return dbInstance;
}

// CRUD functions
export async function getAllNotes() {
  const db = getDatabase();
  return db.select().from(notes).all();
}

export async function getNote(id: string) {
  const db = getDatabase();
  const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return result[0] || undefined;
}

export async function createNote(data: {
  id: string;
  title: string;
  content: string;
  tags: string; // JSON string
  createdAt: number;
  updatedAt: number;
  embedding: string | null; // JSON string or null
}) {
  const db = getDatabase();
  // Ensure embedding defaults to empty array JSON string if not provided
  const embedding = data.embedding || JSON.stringify([]);
  
  // Drizzle maps createdAt to created_at automatically based on schema
  return db.insert(notes).values({
    id: data.id,
    title: data.title,
    content: data.content,
    tags: data.tags,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    embedding: embedding,
  }).run();
}

export async function updateNote(id: string, data: {
  title?: string;
  content?: string;
  tags?: string;
  updatedAt?: number;
  embedding?: string | null | number[]; // Can be array (will be stringified) or string or null
}) {
  const db = getDatabase();
  
  // Stringify embedding if it's an array
  const updateData: any = { ...data };
  if (data.embedding !== undefined && data.embedding !== null) {
    if (Array.isArray(data.embedding)) {
      updateData.embedding = JSON.stringify(data.embedding);
    } else {
      updateData.embedding = data.embedding;
    }
  }
  
  return db.update(notes).set(updateData).where(eq(notes.id, id)).run();
}

export async function deleteNote(id: string) {
  const db = getDatabase();
  return db.delete(notes).where(eq(notes.id, id)).run();
}

export async function getNotesByTag(tag: string) {
  const db = getDatabase();
  const allNotes = await db.select().from(notes).all();
  return allNotes.filter(note => {
    if (!note.tags) return false;
    const tags = JSON.parse(note.tags);
    return Array.isArray(tags) && tags.includes(tag);
  });
}

export async function searchNotesByText(query: string) {
  const db = getDatabase();
  const allNotes = await db.select().from(notes).all();
  const lowerQuery = query.toLowerCase();
  return allNotes.filter(note => {
    const title = (note.title || '').toLowerCase();
    const content = (note.content || '').toLowerCase();
    let tags: string[] = [];
    if (note.tags) {
      try {
        tags = JSON.parse(note.tags);
      } catch (e) {
        tags = [];
      }
    }
    const tagMatch = tags.some(tag => tag.toLowerCase().includes(lowerQuery));
    return title.includes(lowerQuery) || content.includes(lowerQuery) || tagMatch;
  });
}

export async function getAllTags() {
  const db = getDatabase();
  const allNotes = await db.select().from(notes).all();
  const tagSet = new Set<string>();
  allNotes.forEach(note => {
    if (note.tags) {
      try {
        const tags = JSON.parse(note.tags);
        if (Array.isArray(tags)) {
          tags.forEach(tag => tagSet.add(tag));
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }
  });
  return Array.from(tagSet).sort();
}

