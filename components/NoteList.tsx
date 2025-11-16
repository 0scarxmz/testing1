'use client';

import { useEffect, useState } from 'react';
import { getAllNotes } from '@/lib/storage';
import type { Note } from '@/types/note';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';

export function NoteList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const allNotes = await getAllNotes();
      // Sort by updatedAt, most recent first
      const sorted = allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(sorted);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading notes...</div>;
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2">No notes yet</h2>
        <p className="text-muted-foreground mb-4">Create your first note to get started</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-4">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="line-clamp-1">{note.title || 'Untitled'}</CardTitle>
              <CardDescription>
                {format(new Date(note.updatedAt), 'MMM d, yyyy • h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {note.content}
              </p>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-secondary rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

