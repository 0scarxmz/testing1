'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllNotes } from '@/lib/storage';
import type { Note } from '@/types/note';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';
import { markdownToHtml } from '@/lib/markdown';

// Helper function to get plain text from Markdown or HTML
// Uses regex to avoid hydration mismatches between server and client
function getPlainText(content: string): string {
  // First, try to convert markdown to HTML, then strip HTML tags
  // This handles both old HTML content and new Markdown content
  let html = content;
  
  // If it looks like markdown (has markdown syntax), convert it
  if (content.includes('**') || content.includes('*') || content.includes('#') || content.includes('`')) {
    try {
      html = markdownToHtml(content);
    } catch (e) {
      // If conversion fails, use content as-is
      html = content;
    }
  }
  
  // Strip HTML tags
  return html.replace(/<[^>]*>/g, '').trim();
}

interface NoteListProps {
  searchQuery?: string;
  activeTag?: string | null;
  onTagClick?: (tag: string) => void;
  onNotesChange?: () => void;
}

export function NoteList({ searchQuery = '', activeTag = null, onTagClick, onNotesChange }: NoteListProps) {
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
      if (onNotesChange) {
        onNotesChange();
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // First apply tag filter if active
    if (activeTag) {
      filtered = filtered.filter(n => n.tags.includes(activeTag));
    }

    // Then apply search filter within the tag-filtered results
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(lower) || 
        note.content.toLowerCase().includes(lower) ||
        note.tags.some(tag => tag.toLowerCase().includes(lower))
      );
    }

    return filtered;
  }, [notes, activeTag, searchQuery]);

  function handleTagClick(e: React.MouseEvent, tag: string) {
    e.preventDefault();
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(tag);
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

  if (filteredNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2">No notes found</h2>
        <p className="text-muted-foreground mb-4">
          {searchQuery || activeTag ? 'Try adjusting your filters' : 'Create your first note to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 p-2">
      {filteredNotes.map((note) => (
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
                {getPlainText(note.content)}
              </p>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => handleTagClick(e, tag)}
                      className="text-xs px-2 py-1 bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
                    >
                      #{tag}
                    </button>
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

