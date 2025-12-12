'use client';

import React, { useState, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { FileText, ChevronRight } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export function PageBlockComponent({ node, updateAttributes, editor }: any) {
    const router = useRouter();
    const params = useParams();
    const noteId = params?.id as string;

    const pageId = node.attrs.id;
    const [title, setTitle] = useState(node.attrs.title || 'Untitled');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (pageId && noteId) {
            // Navigate to sub-page editing view
            router.push(`/notes/${noteId}/page/${pageId}`);
        }
    }, [pageId, noteId, router]);

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
        if (e.key === 'Escape') {
            setIsEditingTitle(false);
            setTitle(node.attrs.title || 'Untitled');
        }
    }, [title, updateAttributes, node.attrs.title]);

    return (
        <NodeViewWrapper className="page-block my-2">
            <div
                className="group flex items-center gap-2 px-3 py-2.5 border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all select-none"
                onClick={handleClick}
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-5 h-5 text-muted-foreground shrink-0">
                    <FileText className="w-4 h-4" />
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
                        className="flex-1 text-sm font-medium text-foreground/90"
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditingTitle(true);
                        }}
                    >
                        {title}
                    </span>
                )}

                {/* Arrow indicator */}
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
        </NodeViewWrapper>
    );
}
