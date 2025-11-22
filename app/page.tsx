'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/sidebar';
import { NoteList } from '@/components/NoteList';
import { Button } from '@/components/ui/button';
import { getAllNotes } from '@/lib/storage';
import { buildGraphData } from '@/lib/graph/buildGraphData';
import type { Note } from '@/types/note';
import type { GraphData } from '@/lib/graph/buildGraphData';
import Link from 'next/link';
import { Plus } from 'lucide-react';

// Dynamically import GraphView with SSR disabled (required for react-force-graph)
const GraphView = dynamic(
  () => {
    return import('@/components/graph/GraphView').then((mod) => ({ default: mod.GraphView }));
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading graph...</p>
      </div>
    ),
  }
);

export default function Home() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');

  useEffect(() => {
    loadGraphData();
    // Poll for updates every 5 seconds to keep graph in sync
    const interval = setInterval(() => {
      loadGraphData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadGraphData() {
    try {
      const notes: Note[] = await getAllNotes();
      const data = buildGraphData(notes);
      setGraphData(data);
    } catch (error) {
      console.error('Failed to load graph data:', error);
    } finally {
      setGraphLoading(false);
    }
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden relative">
      {/* Left: Sidebar (fixed width) */}
      <div className="w-80 flex-shrink-0">
        <Sidebar 
          onSearchChange={setSearchQuery}
          onTagClick={setActiveTag}
          onModeChange={setSearchMode}
          searchQuery={searchQuery}
          activeTag={activeTag}
          searchMode={searchMode}
        />
      </div>
      
      {/* Center: Notes area (flexible, scrollable) */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-y-auto">
          <NoteList 
            searchQuery={searchQuery}
            activeTag={activeTag}
            searchMode={searchMode}
          />
        </main>
      </div>
      
      {/* Floating New Note Button */}
      <Link href="/notes/new">
        <Button 
          size="lg"
          className="fixed top-4 right-[420px] z-50 shadow-lg rounded-full h-12 w-12 p-0"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </Link>
      
      {/* Right: Graph area (fixed width, always visible) */}
      <div className="w-[400px] min-w-[300px] flex-shrink-0 border-l flex flex-col">
        <header className="border-b flex-shrink-0 px-4 py-4">
          <h2 className="text-xl font-bold">Graph</h2>
        </header>
        <main className="flex-1 overflow-hidden">
          {graphLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading graph...</p>
            </div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm text-center px-4">
                No notes to display. Create some notes to see the graph.
              </p>
            </div>
          ) : (
            <div className="w-full h-full">
              <GraphView data={graphData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
