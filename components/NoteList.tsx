'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllNotes, searchNotesByText, searchNotesSemantic } from '@/lib/storage';
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

type SearchMode = 'keyword' | 'semantic';

interface NoteListProps {
  searchQuery?: string;
  activeTag?: string | null;
  searchMode?: SearchMode;
  onTagClick?: (tag: string) => void;
  onNotesChange?: () => void;
}

export function NoteList({ searchQuery = '', activeTag = null, searchMode = 'keyword', onTagClick, onNotesChange }: NoteListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadNotes();

    // Poll for updates every 5 seconds to catch async AI-generated titles/tags
    const interval = setInterval(() => {
      loadNotes();
    }, 5000);

    return () => clearInterval(interval);
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
    return notes;
  }, [notes]);

  // Handle search separately to support async semantic search
  const [searchResults, setSearchResults] = useState<Note[]>([]);

  useEffect(() => {
    async function performSearch() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        let results: Note[] = [];

        if (searchMode === 'semantic') {
          console.log('Performing semantic search for:', searchQuery);
          const semanticResults = await searchNotesSemantic(searchQuery);
          console.log('Semantic search results:', semanticResults.length, 'notes found');
          results = semanticResults.map(r => r.note);
        } else {
          results = await searchNotesByText(searchQuery);
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }

    performSearch();
  }, [searchQuery, searchMode]);

  // Combine filters: tag filter first, then search
  const displayNotes = useMemo(() => {
    // If we have a search query, use search results directly (especially for semantic search)
    if (searchQuery.trim()) {
      if (searchResults.length > 0) {
        // Apply tag filter to search results if active
        let filtered = searchResults;
        if (activeTag) {
          filtered = filtered.filter(n => n.tags.includes(activeTag));
        }
        return filtered;
      } else {
        // No search results, show empty
        return [];
      }
    }

    // No search query - show all notes with tag filter
    let filtered = filteredNotes;
    if (activeTag) {
      filtered = filtered.filter(n => n.tags.includes(activeTag));
    }
    return filtered;
  }, [filteredNotes, activeTag, searchQuery, searchResults]);

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

  if (searching) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">Searching...</p>
      </div>
    );
  }

  if (displayNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2">No notes found</h2>
        <p className="text-muted-foreground mb-4">
          {searchQuery || activeTag ? 'Try adjusting your filters' : 'Create your first note to get started'}
        </p>
      </div>
    );
  }

  // Helper function to normalize file path for file:// URL (Windows compatibility)
  function normalizeFilePath(filePath: string): string {
    if (!filePath) return '';
    // Normalize file path for file:// URL
    // Windows paths need forward slashes and three slashes after file:
    let normalizedPath = filePath.replace(/\\/g, '/');
    // Ensure it starts with file:// (three slashes for absolute paths)
    if (!normalizedPath.startsWith('file://')) {
      normalizedPath = `file:///${normalizedPath}`;
    }
    return normalizedPath;
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
      {displayNotes.map((note) => {
        // Prioritize coverImagePath over screenshotPath
        const thumbnailPath = note.coverImagePath || note.screenshotPath;
        const thumbnailAlt = note.coverImagePath ? 'Cover' : 'Screenshot';

        return (
          <Link key={note.id} href={`/notes/${note.id}`}>
            <Card className="group hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden min-h-[260px] flex flex-col border-border/60 bg-card/50 hover:bg-card">
              {/* Thumbnail at top of card */}
              {thumbnailPath ? (
                <div className="w-full h-40 overflow-hidden flex-shrink-0 relative">
                  <img
                    src={normalizeFilePath(thumbnailPath)}
                    alt={thumbnailAlt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      console.error('Failed to load thumbnail:', thumbnailPath);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-10 transition-opacity" />
                </div>
              ) : (
                <div className="w-full h-40 bg-secondary/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-4xl opacity-20">📝</span>
                </div>
              )}
              <CardHeader className="p-4 pb-2 flex-shrink-0">
                <CardTitle className="line-clamp-1 text-base font-bold font-serif tracking-tight">{note.title || 'Untitled'}</CardTitle>
                <CardDescription className="text-xs mt-1 font-mono opacity-70">
                  {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1 font-sans leading-relaxed">
                  {getPlainText(note.content)}
                </p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    {note.tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        onClick={(e) => handleTagClick(e, tag)}
                        className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                      >
                        #{tag}
                      </button>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

