'use client';

import { useEffect, useState, useRef } from 'react';

export default function QuickCapturePage() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [noteId, setNoteId] = useState<string | null>(null);

  useEffect(() => {
    // Auto-focus textarea on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    // Load pending note content (e.g. screenshot markdown)
    async function loadPendingNote() {
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.getPendingQuickNote) {
        try {
          const note = await (window as any).desktopAPI.getPendingQuickNote();
          if (note) {
            setNoteId(note.id);
            if (note.content) {
              setInput(note.content);
            }
          }
        } catch (error) {
          console.error('Failed to load pending note:', error);
        }
      }
    }
    loadPendingNote();
  }, []);

  async function handleSubmit() {
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Update the note with the content
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.updateQuickNote) {
        await (window as any).desktopAPI.updateQuickNote(input.trim());
        setInput('');
      } else {
        console.error('desktopAPI.updateQuickNote is not available');
      }
    } catch (error) {
      console.error('Failed to update quick note:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();

      // Delete the temporary note if cancelled
      if (noteId && typeof window !== 'undefined' && (window as any).desktopAPI?.deleteNote) {
        try {
          console.log('Cancelling quick note, deleting:', noteId);
          await (window as any).desktopAPI.deleteNote(noteId);
        } catch (error) {
          console.error('Failed to delete cancelled note:', error);
        }
      }

      if (typeof window !== 'undefined' && (window as any).desktopAPI?.closeQuickCapture) {
        (window as any).desktopAPI.closeQuickCapture();
      }
      setInput('');
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-[550px] mx-6 rounded-xl bg-card/95 backdrop-blur-md shadow-xl border border-border/50 p-6">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search"
          className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/40 text-base leading-relaxed focus:ring-0 focus:outline-none overflow-hidden"
          rows={4}
          disabled={isSubmitting}
        />
        <div className="mt-3 text-xs text-muted-foreground/50 text-center">
          ⌘+Enter to save • ESC to close
        </div>
      </div>
    </div>
  );
}
