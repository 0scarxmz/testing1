'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PageBlockComponent } from './PageBlockComponent';

export interface PageBlockOptions {
    HTMLAttributes: Record<string, any>;
    onNavigateToPage?: (pageId: string, noteId: string) => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        pageBlock: {
            /**
             * Insert a sub-page block with its own content
             */
            insertPageBlock: () => ReturnType;
        };
    }
}

// Generate a unique ID for each page block
function generatePageId(): string {
    return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const PageBlock = Node.create<PageBlockOptions>({
    name: 'pageBlock',

    group: 'block',

    atom: true, // Atomic - content stored as attribute, not inline

    addOptions() {
        return {
            HTMLAttributes: {},
            onNavigateToPage: undefined,
        };
    },

    addAttributes() {
        return {
            id: {
                default: null,
                renderHTML: (attributes: any) => ({
                    'data-id': attributes.id,
                }),
                parseHTML: (element: HTMLElement) => element.getAttribute('data-id'),
            },
            title: {
                default: 'Untitled',
                renderHTML: (attributes: any) => ({
                    'data-title': encodeURIComponent(attributes.title || 'Untitled'),
                }),
                parseHTML: (element: HTMLElement) => decodeURIComponent(element.getAttribute('data-title') || 'Untitled'),
            },
            // Sub-page content stored as markdown string
            pageContent: {
                default: '',
                renderHTML: (attributes: any) => ({
                    'data-page-content': encodeURIComponent(attributes.pageContent || ''),
                }),
                parseHTML: (element: HTMLElement) => decodeURIComponent(element.getAttribute('data-page-content') || ''),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="page-block"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'page-block' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PageBlockComponent);
    },

    addCommands() {
        return {
            insertPageBlock:
                () =>
                    ({ commands }) => {
                        const pageId = generatePageId();
                        console.log('[PageBlock] Creating new sub-page with ID:', pageId);
                        return commands.insertContent({
                            type: this.name,
                            attrs: {
                                id: pageId,
                                title: 'Untitled',
                                pageContent: ''
                            },
                        });
                    },
        };
    },
});

