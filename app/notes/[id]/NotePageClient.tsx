'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNote, updateNote, deleteNote } from '@/lib/storage';
import type { Note } from '@/types/note';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { extractTags } from '@/lib/tags';
import { TagInput } from '@/components/tag-input';
import { RelatedNotes } from '@/components/RelatedNotes';
import { ScreenshotModal } from '@/components/ScreenshotModal';
import { CoverImage } from '@/components/CoverImage';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      
      // Poll for updates every 3 seconds to catch screenshot and AI-generated content
      const interval = setInterval(() => {
        loadNote();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [id, isNew, loadNote]);

  async function handleSave() {
    if (saving) return;

    setSaving(true);
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
        // Explicitly pass null if coverImagePath is empty, otherwise pass the value
        const coverImageUpdate = coverImagePath && coverImagePath.trim() !== '' ? coverImagePath : null;
        await updateNote(id, {
          title: title || 'Untitled',
          content,
          tags: allTags,
          embedding,
          coverImagePath: coverImageUpdate,
        });
        // Explicitly reload note to refresh state from database
        await loadNote();
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            {!isNew && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>
      
      <main className="relative min-h-[calc(100vh-80px)]">
        {/* Cover Image - Full width like Notion */}
        <div className="w-full">
          <CoverImage
            coverImagePath={coverImagePath}
            onChange={async (path) => {
              setCoverImagePath(path);
              // Auto-save cover image immediately when added/changed (like Notion)
              if (!isNew && note && path) {
                try {
                  await updateNote(id, { coverImagePath: path });
                  // Reload note to get updated data
                  await loadNote();
                } catch (err) {
                  console.error('[NotePage] Failed to auto-save cover image:', err);
                }
              } else if (!isNew && note && !path) {
                // Cover image was removed
                try {
                  await updateNote(id, { coverImagePath: null });
                  await loadNote();
                } catch (err) {
                  console.error('[NotePage] Failed to remove cover image:', err);
                }
              }
            }}
            noteId={isNew ? 'new' : id}
          />
        </div>
        
        {/* Content container */}
        <div className="container mx-auto p-8 max-w-5xl relative z-10">
        
        {/* Notion-style cover image */}
        {note?.screenshotPath && (
          <div className="relative w-full h-[180px] rounded-b-xl overflow-hidden mb-6 -mx-8">
            <img
              src={normalizeFilePath(note.screenshotPath)}
              alt="Note cover"
              className="w-full h-full object-cover brightness-90"
            />
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
        )}
        
        {/* Background screenshot - clickable to view full size */}
        {note?.screenshotPath && (
          <div 
            className="absolute inset-0 -z-10 opacity-20 blur-sm rounded-lg cursor-pointer hover:opacity-30 transition-opacity"
            style={{
              backgroundImage: `url(${normalizeFilePath(note.screenshotPath)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            onClick={() => setScreenshotModalOpen(true)}
            title="Click to view full screenshot"
          />
        )}
        
        {/* Semi-transparent overlay for readability */}
        {note?.screenshotPath && (
          <div className="absolute inset-0 -z-10 bg-background/70 rounded-lg" />
        )}
        
        {/* Content on top */}
        <div className="relative z-10 space-y-6">
          <Input
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-3xl font-bold border-0 focus-visible:ring-0 shadow-none bg-transparent py-4"
          />
          <div>
            <TagInput tags={tags} onChange={setTags} placeholder="Add tag..." />
          </div>
          <MarkdownEditor content={content} onChange={setContent} />
          {!isNew && note && note.embedding && (
            <RelatedNotes noteId={note.id} />
          )}
        </div>
        </div>
      </main>
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

