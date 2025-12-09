'use client';

import React, { useState, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageBlockComponent({ node, updateAttributes }: any) {
    const [isOpen, setIsOpen] = useState(node.attrs.isOpen);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [title, setTitle] = useState(node.attrs.title);

    const toggleOpen = useCallback(() => {
        const newIsOpen = !isOpen;
        setIsOpen(newIsOpen);
        updateAttributes({ isOpen: newIsOpen });
    }, [isOpen, updateAttributes]);

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

    return (
        <NodeViewWrapper className="page-block my-2">
            <div className="border border-border/50 rounded-lg bg-muted/20 overflow-hidden">
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors select-none"
                    onClick={toggleOpen}
                >
                    {/* Chevron */}
                    <div
                        className={cn(
                            "transition-transform duration-200",
                            isOpen ? "rotate-90" : "rotate-0"
                        )}
                    >
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Icon */}
                    <FileText className="w-4 h-4 text-muted-foreground" />

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
                            {title || 'Untitled'}
                        </span>
                    )}
                </div>

                {/* Content */}
                {isOpen && (
                    <div className="px-4 py-2 pl-9 border-t border-border/30">
                        <NodeViewContent className="prose dark:prose-invert max-w-none text-sm" />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}
