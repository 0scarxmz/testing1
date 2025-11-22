'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { NoteList } from '@/components/NoteList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { QuoteWidget, NavWidget, WeekViewWidget, UniversityWidget } from '@/components/DashboardWidgets';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');

  return (
    <div className="h-screen bg-background flex overflow-hidden relative font-sans">
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

        {/* Hero / Header Section */}
        <div className="w-full h-48 bg-gradient-to-r from-pink-100 to-blue-100 dark:from-pink-950/30 dark:to-blue-950/30 relative">
          <div className="absolute -bottom-12 left-8">
            {/* Avatar or Icon */}
            <div className="h-24 w-24 rounded-full bg-background border-4 border-background shadow-sm flex items-center justify-center text-4xl overflow-hidden">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" alt="Avatar" className="w-full h-full" />
            </div>
          </div>
        </div>

        <main className="flex-1 p-8 pt-16 max-w-6xl mx-auto w-full">

          {/* Title */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold font-serif mb-2">| h o m e <span className="text-muted-foreground font-normal text-2xl">- template!</span></h1>
          </div>

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
