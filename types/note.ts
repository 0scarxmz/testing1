export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  embedding: number[] | null; // Vector embedding for semantic search
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface Relationship {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  type: 'related' | 'references' | 'similar';
  strength: number; // 0-1, based on similarity or explicit link
  createdAt: number;
}

export interface NoteSearchResult {
  note: Note;
  score: number; // Relevance score for search
}

