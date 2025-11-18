'use client';

import { useEffect, useState } from 'react';
import { getRelatedNotes } from '@/lib/storage';
import type { NoteSearchResult } from '@/types/note';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface RelatedNotesProps {
  noteId: string;
}

export function RelatedNotes({ noteId }: RelatedNotesProps) {
  const [relatedNotes, setRelatedNotes] = useState<NoteSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatedNotes();
  }, [noteId]);

  async function loadRelatedNotes() {
    try {
      setLoading(true);
      const results = await getRelatedNotes(noteId, 5);
      setRelatedNotes(results);
    } catch (error) {
      console.error('Failed to load related notes:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Related Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (relatedNotes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Related Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {relatedNotes.map((result) => {
            const percentage = Math.round(result.score * 100);
            return (
              <Link
                key={result.note.id}
                href={`/notes/${result.note.id}`}
                className="block p-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium line-clamp-1">
                    {result.note.title || 'Untitled'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {percentage}% match
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

