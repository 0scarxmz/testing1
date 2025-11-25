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
    <div className="h-screen w-screen flex items-center justify-center bg-transparent">
      <div
        className="w-full h-full bg-[#feff9c] shadow-lg flex flex-col overflow-hidden relative rounded-sm"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Drag handle / Header area */}
        <div className="h-6 w-full cursor-move flex-shrink-0" />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note..."
          className="flex-1 w-full bg-transparent border-none outline-none resize-none text-gray-800 placeholder:text-gray-500/60 text-lg leading-relaxed focus:ring-0 focus:outline-none p-4 pt-0"
          style={{ WebkitAppRegion: 'no-drag' } as any}
          disabled={isSubmitting}
        />
        <div className="p-2 text-[10px] text-gray-500/60 text-center select-none pb-3">
          ⌘+Enter to save • ESC to close
        </div>
      </div>
    </div>
  );
}
