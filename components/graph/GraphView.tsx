'use client';

// IMPORTANT: Import AFRAME polyfill BEFORE react-force-graph
// This ensures AFRAME exists when react-force-graph tries to access it
import '@/lib/graph/aframe-polyfill';
import '@/lib/graph/three-polyfill';

import { useRouter } from 'next/navigation';
import { ForceGraph2D } from 'react-force-graph';
import type { GraphData } from '@/lib/graph/buildGraphData';

interface GraphViewProps {
  data: GraphData;
}

export function GraphView({ data }: GraphViewProps) {
  const router = useRouter();

  return (
    <ForceGraph2D
      graphData={data}
      nodeLabel="title"
      nodeAutoColorBy="group"
      onNodeClick={(node: any) => {
        router.push(`/notes/${node.id}`);
      }}
    />
  );
}

