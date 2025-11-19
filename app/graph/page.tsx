'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { GraphView } from '@/components/graph/GraphView';
import { getAllNotes } from '@/lib/storage';
import { buildGraphData } from '@/lib/graph/buildGraphData';
import type { Note } from '@/types/note';
import type { GraphData } from '@/lib/graph/buildGraphData';

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraphData();
  }, []);

  async function loadGraphData() {
    try {
      setLoading(true);
      const notes: Note[] = await getAllNotes();
      const data = buildGraphData(notes);
      setGraphData(data);
    } catch (error) {
      console.error('Failed to load graph data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Graph</h1>
          </div>
        </header>
        <main className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading graph...</p>
            </div>
          ) : !graphData || graphData.nodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No notes to display. Create some notes to see the graph.</p>
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

