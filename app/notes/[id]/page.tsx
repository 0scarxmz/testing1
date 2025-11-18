'use client';

import { useEffect, useState } from 'react';
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

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === 'new';

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setNote(null);
      setTitle('');
      setContent('');
      setTags([]);
      setLoading(false);
    } else {
      loadNote();
    }
  }, [id, isNew]);

  async function loadNote() {
    try {
      const loadedNote = await getNote(id);
      if (loadedNote) {
        setNote(loadedNote);
        setTitle(loadedNote.title);
        setContent(loadedNote.content);
        setTags(loadedNote.tags);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to load note:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (saving) return;

    setSaving(true);
    try {
      // Use manual tags, but also merge with auto-extracted tags
      const extractedTags = extractTags(content);
      const allTags = [...new Set([...tags, ...extractedTags])];

      if (isNew) {
        const { createNote } = await import('@/lib/storage');
        const newNote = await createNote({
          title: title || 'Untitled',
          content,
          tags: allTags,
        });
        router.push(`/notes/${newNote.id}`);
        router.refresh();
      } else if (note) {
        await updateNote(id, {
          title: title || 'Untitled',
          content,
          tags: allTags,
        });
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
      <main className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-4">
          <Input
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold border-0 focus-visible:ring-0 shadow-none"
          />
          <div>
            <TagInput tags={tags} onChange={setTags} placeholder="Add tag..." />
          </div>
          <MarkdownEditor content={content} onChange={setContent} />
        </div>
      </main>
    </div>
  );
}

