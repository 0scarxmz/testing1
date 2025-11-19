'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createNote } from '@/lib/storage';
import { extractTags } from '@/lib/tags';
import { useRouter } from 'next/navigation';

interface QuickCaptureContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const QuickCaptureContext = createContext<QuickCaptureContextType | undefined>(undefined);

export function QuickCaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // ⌘+Shift+Space (Mac) or Ctrl+Shift+Space (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleSubmit() {
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const tags = extractTags(input);
      const title = input.split('\n')[0].slice(0, 100) || 'Untitled';
      const content = input;
      const noteText = `${title}\n\n${content}`;

      // Generate embedding (use desktopAPI if in Electron)
      let embedding: number[] | null = null;
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
          // Don't block note creation if embedding fails
        }
      }

      const note = await createNote({
        title,
        content,
        tags,
        embedding,
      });

      setInput('');
      setOpen(false);
      router.push(`/notes/${note.id}`);
      router.refresh();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setInput('');
    }
  }

  return (
    <QuickCaptureContext.Provider value={{ open, setOpen }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Quick Capture</DialogTitle>
            <DialogDescription>
              Press ⌘+Enter to save, Escape to cancel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Type your note here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="min-h-[150px] resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!input.trim() || isSubmitting}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </QuickCaptureContext.Provider>
  );
}

export function useQuickCapture() {
  const context = useContext(QuickCaptureContext);
  if (!context) {
    throw new Error('useQuickCapture must be used within QuickCaptureProvider');
  }
  return context;
}

