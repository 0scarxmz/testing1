'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { FileText, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getNote } from '@/lib/storage';
import type { Note } from '@/types/note';

export function PageBlockComponent({ node, updateAttributes, selected }: any) {
    const router = useRouter();
    const pageId = node.attrs.pageId;
    const [title, setTitle] = useState(node.attrs.title || 'Untitled');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [linkedNote, setLinkedNote] = useState<Note | null>(null);

    // Load the linked note to get the latest title
    useEffect(() => {
        if (pageId) {
            getNote(pageId).then((note) => {
                if (note) {
                    setLinkedNote(note);
                    // Update title from linked note if different
                    if (note.title && note.title !== title) {
                        setTitle(note.title);
                        updateAttributes({ title: note.title });
                    }
                }
            }).catch((err) => {
                console.error('Failed to load linked note:', err);
            });
        }
    }, [pageId, title, updateAttributes]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (pageId) {
            router.push(`/notes/${pageId}`);
        }
    }, [pageId, router]);

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    }, []);

    const handleTitleBlur = useCallback(() => {
        setIsEditingTitle(false);
        updateAttributes({ title: title || 'Untitled' });
    }, [title, updateAttributes]);

    const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsEditingTitle(false);
            updateAttributes({ title: title || 'Untitled' });
        }
    }, [title, updateAttributes]);

    // If no pageId, show a placeholder
    if (!pageId) {
        return (
            <NodeViewWrapper className="page-block my-2">
                <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border/50 rounded-lg bg-muted/10 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm italic">Invalid page link</span>
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper className="page-block my-2">
            <div
                className={`group flex items-center gap-2 px-3 py-2 border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all select-none ${selected ? 'ring-2 ring-primary/30' : ''}`}
                onClick={handleClick}
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-5 h-5 text-muted-foreground shrink-0">
                    {linkedNote?.iconEmoji ? (
                        <span className="text-base">{linkedNote.iconEmoji}</span>
                    ) : (
                        <FileText className="w-4 h-4" />
                    )}
                </div>

                {/* Title */}
                {isEditingTitle ? (
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
                        autoFocus
                    />
                ) : (
                    <span
                        className="flex-1 text-sm font-medium text-foreground/90 truncate"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditingTitle(true);
                        }}
                    >
                        {linkedNote?.title || title || 'Untitled'}
                    </span>
                )}

                {/* Arrow indicator */}
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
        </NodeViewWrapper>
    );
}
