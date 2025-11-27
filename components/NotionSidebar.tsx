'use client';

import React, { useEffect, useState } from 'react';
import {
    FileText,
    ChevronRight,
    Search,
    Plus,
    MoreHorizontal,
    Settings,
    Home,
    Briefcase,
    BarChart2,
    Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllNotes } from '@/lib/storage';
import { Note } from '@/types/note';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppLogo } from './AppLogo';

export function NotionSidebar() {
    const [notes, setNotes] = useState<Note[]>([]);
    const pathname = usePathname();
    const router = useRouter();

    // Mock Workspace items to match the screenshot vibe
    const workspaceItems = [
        { icon: Home, label: 'Home', href: '/' },
        { icon: BarChart2, label: 'Analysis', href: '#' },
        { icon: Briefcase, label: 'Project Plan', href: '#' },
        { icon: Layers, label: 'More', href: '#' },
    ];

    useEffect(() => {
        loadNotes();

        // Refresh notes periodically to catch updates
        const interval = setInterval(loadNotes, 5000);
        return () => clearInterval(interval);
    }, []);

    async function loadNotes() {
        try {
            const allNotes = await getAllNotes();
            // Sort by updated at desc
            setNotes(allNotes.sort((a, b) => b.updatedAt - a.updatedAt));
        } catch (error) {
            console.error('Failed to load notes:', error);
        }
    }

    const handleNoteClick = (noteId: string) => {
        router.push(`/notes/${noteId}`);
    };

    return (
        <div className="w-60 h-full bg-[#F7F7F5] dark:bg-[#202020] flex flex-col font-sans text-[#37352f] dark:text-[#d4d4d4] group/sidebar">

            {/* Workspace Switcher / Header */}
            <div className="h-12 flex items-center px-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors m-1 rounded-sm">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-5 h-5 rounded-sm shrink-0 bg-white shadow-sm flex items-center justify-center overflow-hidden">
                        <AppLogo size="sm" editable={false} />
                    </div>
                    <span className="font-medium text-sm truncate">Workspaces</span>
                    <div className="ml-auto text-muted-foreground">
                        <ChevronRight className="w-3 h-3 rotate-90" />
                    </div>
                </div>
            </div>

            {/* Search & Settings Quick Links (Notion style) */}
            <div className="px-1 mb-2">
                <div className="flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-sm cursor-pointer transition-colors">
                    <Search className="w-4 h-4" />
                    <span className="truncate">Search</span>
                    <span className="ml-auto text-xs opacity-60 border border-muted-foreground/30 px-1 rounded">⌘K</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-sm cursor-pointer transition-colors">
                    <Settings className="w-4 h-4" />
                    <span className="truncate">Settings</span>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-1 scrollbar-hide">

                {/* Workspace Section */}
                <div className="mb-4">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground/60 hover:text-muted-foreground/80 cursor-pointer transition-colors flex items-center group/header">
                        <span>Workspace</span>
                    </div>
                    <div className="space-y-[1px]">
                        {workspaceItems.map((item, index) => (
                            <div
                                key={index}
                                className="group flex items-center gap-2 px-3 py-1 min-h-[28px] text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground cursor-pointer rounded-sm transition-colors"
                            >
                                <div className="flex items-center justify-center w-4 h-4 shrink-0">
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </div>
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Private Section (Real Notes) */}
                <div className="mb-4">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground/60 hover:text-muted-foreground/80 cursor-pointer transition-colors flex items-center justify-between group/header">
                        <span>Private</span>
                        <Plus className="w-3 h-3 opacity-0 group-hover/header:opacity-100 transition-opacity hover:bg-black/10 rounded-sm" onClick={(e) => {
                            e.stopPropagation();
                            router.push('/notes/new');
                        }} />
                    </div>

                    <div className="space-y-[1px]">
                        {notes.map((note) => {
                            const isActive = pathname === `/notes/${note.id}`;
                            return (
                                <div
                                    key={note.id}
                                    onClick={() => handleNoteClick(note.id)}
                                    className={cn(
                                        "group flex items-center gap-2 px-3 py-1 min-h-[28px] text-sm cursor-pointer rounded-sm transition-colors",
                                        isActive
                                            ? "bg-black/5 dark:bg-white/10 text-foreground font-medium"
                                            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-center w-4 h-4 shrink-0">
                                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                    </div>

                                    <div className="flex items-center justify-center w-4 h-4 shrink-0 text-foreground/80">
                                        {note.iconEmoji ? (
                                            <span className="text-xs">{note.iconEmoji}</span>
                                        ) : (
                                            <FileText className="w-4 h-4" />
                                        )}
                                    </div>

                                    <span className="truncate flex-1">{note.title || 'Untitled'}</span>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                    </div>
                                </div>
                            );
                        })}

                        {notes.length === 0 && (
                            <div className="px-3 py-2 text-xs text-muted-foreground italic pl-9">
                                No notes yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Favorites Section (Placeholder) */}
                <div className="mb-4">
                    <div className="px-3 py-1 text-xs font-semibold text-muted-foreground/60 hover:text-muted-foreground/80 cursor-pointer transition-colors">
                        <span>Favorites</span>
                    </div>
                    <div className="px-3 py-1 text-xs text-muted-foreground/40 italic pl-9">
                        Drag items here to favorite
                    </div>
                </div>

            </div>

            {/* Bottom Action / New Page */}
            <div className="p-2 border-t border-border/10">
                <div
                    onClick={() => router.push('/notes/new')}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-sm cursor-pointer flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">New Page</span>
                </div>
            </div>
        </div>
    );
}
