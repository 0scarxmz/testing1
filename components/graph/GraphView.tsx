'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { GraphData } from '@/lib/graph/buildGraphData';

// Props for the ForceGraph2D wrapper
type ForceGraph2DProps = {
  graphData: GraphData;
  nodeLabel?: string;
  nodeAutoColorBy?: string;
  onNodeClick?: (node: any) => void;
};

// IMPORTANT: only use react-force-graph-2d here, and load it dynamically
const ForceGraph2D = dynamic<ForceGraph2DProps>(
  () =>
    import('react-force-graph-2d').then((mod: any) => mod.default ?? mod.ForceGraph2D),
  { ssr: false }
);

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
        if (node?.id) {
          router.push(`/notes/${node.id}`);
        }
      }}
    />
  );
}
