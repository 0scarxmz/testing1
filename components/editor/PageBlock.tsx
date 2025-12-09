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
             * Insert a page block
             */
            insertPageBlock: () => ReturnType;
        };
    }
}

export const PageBlock = Node.create<PageBlockOptions>({
    name: 'pageBlock',

    group: 'block',

    content: 'block+',

    defining: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            title: {
                default: 'Untitled',
            },
            isOpen: {
                default: true,
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
                () =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: { title: 'Untitled', isOpen: true },
                            content: [
                                {
                                    type: 'paragraph',
                                },
                            ],
                        });
                    },
        };
    },
});
