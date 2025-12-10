'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNote, updateNote, deleteNote, createNote } from '@/lib/storage';
import type { Note } from '@/types/note';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2, Cloud, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { extractTags } from '@/lib/tags';
import { TagInput } from '@/components/tag-input';
import { RelatedNotes } from '@/components/RelatedNotes';
import { ScreenshotModal } from '@/components/ScreenshotModal';
import { CoverImage } from '@/components/CoverImage';
import { AppLogo } from '@/components/AppLogo';
import { NoteIcon } from '@/components/NoteIcon';

export function NotePageClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [coverImagePath, setCoverImagePath] = useState<string | null>(null);
  const [iconPath, setIconPath] = useState<string | null>(null);
  const [iconEmoji, setIconEmoji] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);

  const loadNote = useCallback(async () => {
    try {
      const loadedNote = await getNote(id);
      if (loadedNote) {
        setNote(loadedNote);
        setTitle(loadedNote.title);
        setContent(loadedNote.content);
        setTags(loadedNote.tags);
        setCoverImagePath(loadedNote.coverImagePath || null);
        setIconPath(loadedNote.iconPath || null);
        setIconEmoji(loadedNote.iconEmoji || null);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isNew) {
      setNote(null);
      setTitle('');
      setContent('');
      setTags([]);
      setCoverImagePath(null);
      setLoading(false);
    } else {
      loadNote();
    }
  }, [id, isNew, loadNote]);

  const saveNote = useCallback(async () => {
    setSaveStatus('saving');
    try {
      // Use manual tags, but also merge with auto-extracted tags
      const extractedTags = extractTags(content);
      const allTags = [...new Set([...tags, ...extractedTags])];

      // Generate embedding from title + content (use desktopAPI if in Electron)
      let embedding: number[] | null = null;
      const noteText = `${title || 'Untitled'}\n\n${content}`;
      if (noteText.trim().length > 0) {
        try {
          // Check if we're in Electron and desktopAPI is available
          if (typeof window !== 'undefined' && (window as any).desktopAPI?.generateEmbedding) {
            embedding = await (window as any).desktopAPI.generateEmbedding(noteText);
          } else {
            // Fallback to browser-side embedding (requires API key in frontend)
            const { generateEmbedding, isEmbeddingAvailable } = await import('@/lib/embeddings');
            if (isEmbeddingAvailable()) {
              embedding = await generateEmbedding(noteText);
            }
          }
        } catch (error) {
          console.error('Failed to generate embedding:', error);
          // Don't block save if embedding fails
        }
      }

      if (isNew) {
        const { createNote } = await import('@/lib/storage');
        // Explicitly pass null if coverImagePath is empty, otherwise pass the value
        const coverImageForCreate = coverImagePath && coverImagePath.trim() !== '' ? coverImagePath : undefined;
        const newNote = await createNote({
          title: title || 'Untitled',
          content,
          tags: allTags,
          embedding,
          coverImagePath: coverImageForCreate,
        });

        // If cover image was saved with 'new' as ID, rename it to use the real note ID
        if (coverImagePath && coverImagePath.includes('new') && typeof window !== 'undefined' && (window as any).desktopAPI) {
          try {
            // Copy the file to the new note ID
            const newPath = await (window as any).desktopAPI.saveCoverImage(coverImagePath, newNote.id);
            if (newPath) {
              // Delete the old file with 'new' ID
              await (window as any).desktopAPI.deleteCoverImage(coverImagePath);
              // Update the note with the correct path
              await updateNote(newNote.id, { coverImagePath: newPath });
            }
          } catch (error) {
            console.error('Failed to rename cover image:', error);
            // Continue anyway - the note is created
          }
        }

        router.push(`/notes/${newNote.id}`);
        router.refresh();
      } else if (note) {
        // Explicitly pass undefined if coverImagePath is empty, otherwise pass the value
        const coverImageUpdate = coverImagePath && coverImagePath.trim() !== '' ? coverImagePath : undefined;
        await updateNote(id, {
          title: title || 'Untitled',
          content,
          tags: allTags,
          embedding,
          coverImagePath: coverImageUpdate,
          iconPath: iconPath || undefined,
          iconEmoji: iconEmoji || undefined
        });
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveStatus('error');
    }
  }, [content, coverImagePath, iconEmoji, iconPath, id, isNew, note, router, tags, title]);

  // Auto-save effect
  useEffect(() => {
    if (loading) return;

    // Don't auto-save if nothing changed (optional optimization, but hard to track "changed" without refs)
    // For now, we rely on the fact that this effect only runs when deps change.

    setSaveStatus('unsaved');

    const timer = setTimeout(() => {
      saveNote();
    }, 1000);

    return () => clearTimeout(timer);
  }, [title, content, tags, coverImagePath, iconPath, iconEmoji, saveNote, loading]);

  async function handleDelete() {
    if (!note || !confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote(id);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    }
  }

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
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
    <div className="min-h-screen bg-background font-sans">
      {/* Header / Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 transition-all duration-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo and Breadcrumb */}
          <div className="flex items-center gap-3">
            <AppLogo size="sm" editable={true} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <span className="opacity-50">/</span> Home
              </Link>
              <span className="opacity-30">/</span>
              <span className="truncate max-w-[200px] font-medium text-foreground">{title || 'Untitled'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-2 text-xs text-muted-foreground">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Cloud className="h-3 w-3" />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <span className="opacity-50">Unsaved changes...</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-destructive">Error saving</span>
              )}
            </div>

            {!isNew && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative min-h-screen pb-32 pt-14">
        {/* Cover Image Area */}
        <div className="group relative w-full h-[30vh] min-h-[200px] bg-secondary/30 border-b border-border/50">
          <CoverImage
            coverImagePath={coverImagePath}
            editable={true}
            onChange={async (path) => {
              setCoverImagePath(path);
            }}
            noteId={isNew ? 'new' : id}
          />

          {/* Gradient overlay for text readability if needed */}
          {coverImagePath && (
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto px-8 relative">

          {/* Icon / Emoji */}
          <div className="-mt-12 mb-8 relative z-10 ml-2">
            <NoteIcon
              noteId={isNew ? 'new' : id}
              iconPath={iconPath}
              iconEmoji={iconEmoji}
              editable={true}
              onChange={async (data) => {
                if (data.emoji !== undefined) {
                  setIconEmoji(data.emoji);
                  setIconPath(null);
                }
                if (data.path !== undefined) {
                  setIconPath(data.path);
                  setIconEmoji(null);
                }
              }}
            />
          </div>

          {/* Title Input */}
          <div className="mb-6 group">
            <Input
              placeholder="Untitled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-5xl font-bold font-serif border-0 focus-visible:ring-0 shadow-none bg-transparent p-0 h-auto placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Metadata / Tags */}
          <div className="flex items-center gap-4 mb-8 text-sm text-muted-foreground border-b border-border/40 pb-6">
            <div className="flex items-center gap-2 min-w-[100px]">
              <span className="opacity-60">Tags</span>
            </div>
            <div className="flex-1">
              <TagInput tags={tags} onChange={setTags} placeholder="Empty" />
            </div>
          </div>

          {/* Editor */}
          <div className="min-h-[400px]">
            <MarkdownEditor
              content={content}
              onChange={setContent}
              editable={true}
              onCreatePage={async () => {
                try {
                  // Create a nested page with parentId set to current note
                  const parentId = isNew ? undefined : id;
                  const newNote = await createNote({
                    title: 'Untitled',
                    content: '',
                    tags: [],
                    embedding: null,
                    parentId: parentId, // Link to parent note
                  });
                  return newNote.id;
                } catch (error) {
                  console.error('Failed to create nested page:', error);
                  return null;
                }
              }}
            />
          </div>

          {/* Related Notes */}
          {!isNew && note && note.embedding && (
            <div className="mt-16 pt-8 border-t border-border/40">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Related Notes</h3>
              <RelatedNotes noteId={note.id} />
            </div>
          )}
        </div>
      </main>

      {/* Screenshot Modal */}
      {note?.screenshotPath && (
        <ScreenshotModal
          open={screenshotModalOpen}
          onOpenChange={setScreenshotModalOpen}
          screenshotPath={note.screenshotPath}
        />
      )}
    </div>
  );
}

