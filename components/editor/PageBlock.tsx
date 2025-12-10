'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PageBlockComponent } from './PageBlockComponent';

export interface PageBlockOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        pageBlock: {
            /**
             * Insert a page block linking to a note
             */
            insertPageBlock: (pageId: string, title?: string) => ReturnType;
        };
    }
}

export const PageBlock = Node.create<PageBlockOptions>({
    name: 'pageBlock',

    group: 'block',

    atom: true, // Atomic node - no editable content inside

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            pageId: {
                default: null, // ID of the linked note
            },
            title: {
                default: 'Untitled',
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
        return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'page-block' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PageBlockComponent);
    },

    addCommands() {
        return {
            insertPageBlock:
                (pageId: string, title?: string) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: { pageId, title: title || 'Untitled' },
                        });
                    },
        };
    },
});
