'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { NoteList } from '@/components/NoteList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { QuoteWidget, NavWidget, WeekViewWidget, UniversityWidget } from '@/components/DashboardWidgets';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const router = useRouter();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus the search input
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // ⌘+N or Ctrl+N for new note
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        router.push('/notes/new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <div className="h-screen bg-background flex overflow-hidden relative font-sans transition-colors duration-300">
      {/* Left: Sidebar (fixed width) */}
      <div className="w-72 flex-shrink-0 border-r border-border/50 bg-sidebar/50 backdrop-blur-sm">
        <Sidebar
          onSearchChange={setSearchQuery}
          onTagClick={setActiveTag}
          onModeChange={setSearchMode}
          searchQuery={searchQuery}
          activeTag={activeTag}
          searchMode={searchMode}
        />
      </div>

      {/* Center: Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-y-auto">

        {/* Clean Header Section */}
        <div className="w-full border-b border-border/30 bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* App Icon/Logo */}
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-orange-500 flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">Noteshot</h1>
                <p className="text-sm text-muted-foreground">Your personal knowledge base</p>
              </div>
            </div>

            {/* Right Actions */}
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>
        </div>

        <main className="flex-1 p-8 max-w-6xl mx-auto w-full">

          {/* Quote Widget */}
          <QuoteWidget />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Widgets */}
            <div className="md:col-span-4 space-y-6">
              <NavWidget />
              <WeekViewWidget />
              <UniversityWidget />

              <div className="bg-secondary/30 p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center min-h-[150px]">
                <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW54eW54eW54eW54eW54eW54eW54eW54eW54eW54eW54eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l4KibWpBGWchSqCRy/giphy.gif" alt="Plant" className="w-24 h-24 opacity-80 mix-blend-multiply dark:mix-blend-normal" />
                <p className="text-xs text-muted-foreground mt-2 font-serif italic">keep growing</p>
              </div>
            </div>

            {/* Right Column: Notes */}
            <div className="md:col-span-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-serif border-b-2 border-primary/20 pb-1 pr-4">
                  {activeTag ? `#${activeTag}` : 'Recent Notes'}
                </h2>
                <div className="text-xs text-muted-foreground font-mono">
                  {searchQuery ? `Searching: "${searchQuery}"` : 'All Tasks'}
                </div>
              </div>

              <NoteList
                searchQuery={searchQuery}
                activeTag={activeTag}
                searchMode={searchMode}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Floating New Note Button */}
      <Link href="/notes/new">
        <Button
          size="lg"
          className="fixed bottom-8 right-8 z-50 shadow-lg rounded-full h-14 w-14 p-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-transform hover:scale-105"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
