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
      // Check if we're in Electron and desktopAPI is available
      if (typeof window !== 'undefined' && (window as any).desktopAPI?.createQuickNote) {
        await (window as any).desktopAPI.createQuickNote(input.trim());
        setInput('');
      } else {
        console.error('desktopAPI.createQuickNote is not available');
      }
    } catch (error) {
      console.error('Failed to create quick note:', error);
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[500px] rounded-3xl border border-white/10 bg-white/5 dark:bg-black/5 backdrop-blur-xl shadow-2xl p-6 animate-in fade-in duration-200">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="quick note…"
          className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-lg leading-relaxed focus:ring-0 focus:outline-none"
          style={{ minHeight: '120px' }}
          disabled={isSubmitting}
        />
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save • ESC to close
        </div>
      </div>
    </div>
  );
}

