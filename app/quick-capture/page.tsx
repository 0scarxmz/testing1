'use client';

import { useEffect, useState, useRef } from 'react';

export default function QuickCapturePage() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [noteId, setNoteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScreenshot, setAutoScreenshot] = useState(true);

  useEffect(() => {
    // Auto-focus textarea on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    // Load settings
    async function loadSettings() {
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.getSettings) {
        try {
          const enabled = await (window as any).desktopAPI.getSettings('autoScreenshot');
          setAutoScreenshot(enabled !== false); // Default to true if undefined
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    }
    loadSettings();

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

  async function toggleAutoScreenshot() {
    const newValue = !autoScreenshot;
    setAutoScreenshot(newValue);
    if (typeof window !== 'undefined' && (window as any).desktopAPI?.updateSettings) {
      try {
        await (window as any).desktopAPI.updateSettings('autoScreenshot', newValue);
      } catch (error) {
        console.error('Failed to update settings:', error);
      }
    }
  }

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
    <div className="h-screen w-screen flex items-center justify-center bg-transparent font-sans">
      <div
        className="w-full h-full bg-[#fdf6b2] shadow-2xl flex flex-col overflow-hidden relative rounded-sm border border-[#e8e2a2]"
        style={{
          WebkitAppRegion: 'drag',
          backgroundImage: 'linear-gradient(to bottom right, #fff9c4, #fff59d)',
        } as any}
      >
        {/* Subtle top bar / Drag handle */}
        <div className="h-5 w-full cursor-move flex-shrink-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-1 rounded-full bg-black/5 mt-1"></div>
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jot something down..."
          className="flex-1 w-full bg-transparent border-none outline-none resize-none text-[#37352f] placeholder:text-[#37352f]/40 text-lg leading-relaxed focus:ring-0 focus:outline-none p-5 pt-1 font-medium selection:bg-[#d4d09b]/30"
          style={{ WebkitAppRegion: 'no-drag' } as any}
          disabled={isSubmitting}
        />
        <div className="px-4 py-2 flex justify-between items-center text-[10px] text-[#37352f]/40 select-none pb-3">
          <div className="flex items-center gap-3">
            <span>Quick Note</span>
            <div className="relative group" style={{ WebkitAppRegion: 'no-drag' } as any}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="hover:text-[#37352f] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>

              {showSettings && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#fdf6b2] border border-[#e8e2a2] shadow-xl rounded-md p-2 z-50">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-black/5 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={autoScreenshot}
                      onChange={toggleAutoScreenshot}
                      className="rounded border-[#e8e2a2] text-[#37352f] focus:ring-0 bg-transparent"
                    />
                    <span>Auto-screenshot</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <span className="opacity-70">⌘+Enter to save</span>
        </div>
      </div>
    </div>
  );
}
