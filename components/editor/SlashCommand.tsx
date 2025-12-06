'use client';

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import { CommandList } from './CommandList';
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Code,
    Minus,
    FileText,
    Image
} from 'lucide-react';

export interface CommandItem {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    command: (props: { editor: any; range: any }) => void;
}

const getSuggestionItems = ({ query, onCreatePage }: { query: string; onCreatePage?: () => Promise<string | null> }): CommandItem[] => {
    const items: CommandItem[] = [
        {
            title: 'Heading 1',
            description: 'Large section heading',
            icon: Heading1,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
            },
        },
        {
            title: 'Heading 2',
            description: 'Medium section heading',
            icon: Heading2,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
            },
        },
        {
            title: 'Heading 3',
            description: 'Small section heading',
            icon: Heading3,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
            },
        },
        {
            title: 'Bullet List',
            description: 'Create a simple bullet list',
            icon: List,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
        },
        {
            title: 'Numbered List',
            description: 'Create a numbered list',
            icon: ListOrdered,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
        },
        {
            title: 'Quote',
            description: 'Capture a quote',
            icon: Quote,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
            },
        },
        {
            title: 'Code Block',
            description: 'Capture a code snippet',
            icon: Code,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
            },
        },
        {
            title: 'Divider',
            description: 'Visual divider',
            icon: Minus,
            command: ({ editor, range }) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
        },
        {
            title: 'Page',
            description: 'Create a new page and link to it',
            icon: FileText,
            command: async ({ editor, range }) => {
                if (onCreatePage) {
                    const noteId = await onCreatePage();
                    if (noteId) {
                        editor.chain().focus().deleteRange(range).insertContent(`[Untitled](/notes/${noteId})`).run();
                    }
                }
            },
        },
    ];

    return items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );
};

export const SlashCommand = Extension.create({
    name: 'slashCommand',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
                    props.command({ editor, range });
                },
            },
            onCreatePage: undefined as (() => Promise<string | null>) | undefined,
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
                items: ({ query }: { query: string }) => {
                    return getSuggestionItems({ query, onCreatePage: this.options.onCreatePage });
                },
                render: () => {
                    let component: ReactRenderer | null = null;
                    let popup: Instance[] | null = null;

                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(CommandList, {
                                props,
                                editor: props.editor,
                            });

                            if (!props.clientRect) {
                                return;
                            }

                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                            });
                        },

                        onUpdate: (props: any) => {
                            component?.updateProps(props);

                            if (!props.clientRect) {
                                return;
                            }

                            popup?.[0]?.setProps({
                                getReferenceClientRect: props.clientRect,
                            });
                        },

                        onKeyDown: (props: any) => {
                            if (props.event.key === 'Escape') {
                                popup?.[0]?.hide();
                                return true;
                            }

                            return (component?.ref as any)?.onKeyDown(props);
                        },

                        onExit: () => {
                            popup?.[0]?.destroy();
                            component?.destroy();
                        },
                    };
                },
            }),
        ];
    },
});
