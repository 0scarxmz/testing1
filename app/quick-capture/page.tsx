'use client';

import { useEffect, useState, useRef } from 'react';

export default function QuickCapturePage() {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus textarea on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.closeQuickCapture) {
        (window as any).desktopAPI.closeQuickCapture();
      }
      setInput('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="w-full max-w-[500px] rounded-lg border border-gray-200 bg-white shadow-lg p-6">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your note..."
          className="w-full bg-white border-none outline-none resize-none text-gray-900 placeholder:text-gray-400 text-base leading-relaxed focus:ring-0 focus:outline-none"
          style={{ minHeight: '120px' }}
          disabled={isSubmitting}
        />
        <div className="mt-4 text-xs text-gray-500 text-center">
          Press ⌘+Enter to save • ESC to close
        </div>
      </div>
    </div>
  );
}

