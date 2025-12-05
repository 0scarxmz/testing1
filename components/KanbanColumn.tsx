'use client';

import { Note } from '@/types/note';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Circle, Loader2, CheckCircle2 } from 'lucide-react';

type StatusType = 'todo' | 'in-progress' | 'done';

interface KanbanColumnProps {
    status: StatusType;
    notes: Note[];
}

const columnConfig: Record<StatusType, { title: string; icon: React.ReactNode; color: string }> = {
    'todo': {
        title: 'To Do',
        icon: <Circle className="h-4 w-4" />,
        color: 'border-t-blue-500',
    },
    'in-progress': {
        title: 'In Progress',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        color: 'border-t-yellow-500',
    },
    'done': {
        title: 'Done',
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'border-t-green-500',
    },
};

export function KanbanColumn({ status, notes }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });

    const config = columnConfig[status];

    return (
        <div
            ref={setNodeRef}
            className={`
        flex flex-col min-h-[500px] w-80 flex-shrink-0
        bg-secondary/30 rounded-xl border border-border
        border-t-4 ${config.color}
        ${isOver ? 'ring-2 ring-primary/50 bg-secondary/50' : ''}
        transition-all duration-200
      `}
        >
            {/* Column Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{config.icon}</span>
                    <h3 className="font-semibold text-foreground">{config.title}</h3>
                    <span className="ml-auto text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                        {notes.length}
                    </span>
                </div>
            </div>

            {/* Cards Container */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                    {notes.map((note) => (
                        <KanbanCard key={note.id} note={note} />
                    ))}
                </SortableContext>

                {notes.length === 0 && (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Drop notes here</p>
                    </div>
                )}
            </div>
        </div>
    );
}
