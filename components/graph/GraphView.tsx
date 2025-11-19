'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { GraphData } from '@/lib/graph/buildGraphData';

// Dynamically import react-force-graph to avoid SSR issues
const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

interface GraphViewProps {
  data: GraphData;
}

export function GraphView({ data }: GraphViewProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        graphData={data}
        nodeLabel="title"
        onNodeClick={(node) => {
          router.push(`/notes/${node.id}`);
        }}
      />
    </div>
  );
}

