import type { Note } from '@/types/note';

export interface GraphNode {
  id: string;
  title: string;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Builds graph data from notes, creating nodes and tag-based edges.
 * Notes sharing the same tag are connected with edges labeled by the tag.
 * 
 * @param notes - Array of notes to convert to graph format
 * @returns Graph data with nodes and links
 */
export function buildGraphData(notes: Note[]): GraphData {
  // Convert notes to nodes
  const nodes: GraphNode[] = notes.map((note) => ({
    id: note.id,
    title: note.title,
  }));

  // Build tag-based edges
  const links: GraphLink[] = [];
  const tagMap: Record<string, string[]> = {};

  // Group note IDs by tag
  notes.forEach((note) => {
    note.tags.forEach((tag) => {
      if (!tagMap[tag]) {
        tagMap[tag] = [];
      }
      tagMap[tag].push(note.id);
    });
  });

  // Create edges for all pairs of notes sharing the same tag
  for (const tag in tagMap) {
    const noteIds = tagMap[tag];
    
    // Only create edges if there are at least 2 notes with this tag
    if (noteIds.length < 2) continue;

    // Create links between all pairs of notes with this tag
    for (let i = 0; i < noteIds.length; i++) {
      for (let j = i + 1; j < noteIds.length; j++) {
        links.push({
          source: noteIds[i],
          target: noteIds[j],
          label: tag,
        });
      }
    }
  }

  // TODO: Add semantic edges based on embedding similarity
  // This will be implemented later when semantic search is fully integrated

  return { nodes, links };
}

