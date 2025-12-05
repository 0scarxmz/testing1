'use client';

import { useState, useEffect } from 'react';
import { Note } from '@/types/note';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

type StatusType = 'todo' | 'in-progress' | 'done';

interface KanbanBoardProps {
    notes: Note[];
    onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
}

export function KanbanBoard({ notes, onUpdateNote }: KanbanBoardProps) {
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    // Group notes by status
    const [columns, setColumns] = useState<Record<StatusType, Note[]>>({
        'todo': [],
        'in-progress': [],
        'done': [],
    });

    // Update columns when notes change
    useEffect(() => {
        const grouped: Record<StatusType, Note[]> = {
            'todo': [],
            'in-progress': [],
            'done': [],
        };

        notes.forEach((note) => {
            const status = (note.status as StatusType) || 'todo';
            if (grouped[status]) {
                grouped[status].push(note);
            } else {
                grouped['todo'].push(note);
            }
        });

        // Sort by updatedAt within each column
        Object.keys(grouped).forEach((status) => {
            grouped[status as StatusType].sort((a, b) => b.updatedAt - a.updatedAt);
        });

        setColumns(grouped);
    }, [notes]);

    // Configure sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Minimum drag distance before activation
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const note = notes.find((n) => n.id === active.id);
        if (note) {
            setActiveNote(note);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find current column for active item
        let sourceColumn: StatusType | null = null;
        let targetColumn: StatusType | null = null;

        for (const [status, noteList] of Object.entries(columns)) {
            if (noteList.some((n) => n.id === activeId)) {
                sourceColumn = status as StatusType;
            }
            if (status === overId || noteList.some((n) => n.id === overId)) {
                targetColumn = overId as StatusType;
                // If overId is a note ID, find its column
                if (!['todo', 'in-progress', 'done'].includes(overId)) {
                    for (const [s, nList] of Object.entries(columns)) {
                        if (nList.some((n) => n.id === overId)) {
                            targetColumn = s as StatusType;
                            break;
                        }
                    }
                }
            }
        }

        if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) return;

        // Move note to new column
        setColumns((prev) => {
            const newColumns = { ...prev };
            const sourceNotes = [...newColumns[sourceColumn!]];
            const targetNotes = [...newColumns[targetColumn!]];

            const noteIndex = sourceNotes.findIndex((n) => n.id === activeId);
            if (noteIndex === -1) return prev;

            const [movedNote] = sourceNotes.splice(noteIndex, 1);
            targetNotes.push({ ...movedNote, status: targetColumn });

            newColumns[sourceColumn!] = sourceNotes;
            newColumns[targetColumn!] = targetNotes;

            return newColumns;
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveNote(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the target column
        let targetColumn: StatusType = 'todo';

        if (['todo', 'in-progress', 'done'].includes(overId)) {
            targetColumn = overId as StatusType;
        } else {
            // Find which column the over item belongs to
            for (const [status, noteList] of Object.entries(columns)) {
                if (noteList.some((n) => n.id === overId)) {
                    targetColumn = status as StatusType;
                    break;
                }
            }
        }

        // Find the note and its current status
        const note = notes.find((n) => n.id === activeId);
        if (!note) return;

        // Only update if status changed
        if (note.status !== targetColumn) {
            try {
                await onUpdateNote(activeId, { status: targetColumn });
            } catch (error) {
                console.error('Failed to update note status:', error);
                // Revert optimistic update on error
                setColumns((prev) => {
                    const grouped: Record<StatusType, Note[]> = {
                        'todo': [],
                        'in-progress': [],
                        'done': [],
                    };
                    notes.forEach((n) => {
                        const status = (n.status as StatusType) || 'todo';
                        grouped[status].push(n);
                    });
                    return grouped;
                });
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-6 p-6 overflow-x-auto min-h-[600px]">
                <KanbanColumn status="todo" notes={columns['todo']} />
                <KanbanColumn status="in-progress" notes={columns['in-progress']} />
                <KanbanColumn status="done" notes={columns['done']} />
            </div>

            {/* Drag Overlay - Shows what's being dragged */}
            <DragOverlay>
                {activeNote ? (
                    <div className="opacity-80 rotate-3">
                        <KanbanCard note={activeNote} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
