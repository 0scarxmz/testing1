'use client';

import { Note } from '@/types/note';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Flag, FileText } from 'lucide-react';
import Link from 'next/link';

interface KanbanCardProps {
    note: Note;
}

const priorityConfig = {
    high: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔴' },
    medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '🟡' },
    low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🟢' },
};

export function KanbanCard({ note }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: note.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priority = note.priority || 'medium';
    const priorityStyle = priorityConfig[priority];

    // Get first 80 chars of content for preview
    const contentPreview = note.content
        ? note.content.replace(/[#*`\[\]!]/g, '').slice(0, 80) + (note.content.length > 80 ? '...' : '')
        : 'No content';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
        group relative bg-card border border-border rounded-lg p-3
        hover:border-primary/50 hover:shadow-lg transition-all duration-200
        ${isDragging ? 'opacity-50 shadow-2xl scale-105 z-50' : ''}
      `}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Card Content */}
            <Link href={`/notes/${note.id}`} className="block pl-4">
                {/* Title */}
                <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-2">
                    {note.iconEmoji && <span className="mr-1">{note.iconEmoji}</span>}
                    {note.title || 'Untitled'}
                </h4>

                {/* Content Preview */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {contentPreview}
                </p>

                {/* Footer: Priority + Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Priority Badge */}
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityStyle.color}`}>
                        {priorityStyle.icon} {priority}
                    </span>

                    {/* Tags */}
                    {note.tags && note.tags.slice(0, 2).map((tag) => (
                        <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </Link>
        </div>
    );
}
