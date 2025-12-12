'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNote, updateNote } from '@/lib/storage';
import type { Note } from '@/types/note';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Cloud, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

// Extract page block data from the parent note's content (HTML format)
function extractPageBlockFromHtml(html: string, pageId: string): { title: string; pageContent: string } | null {
    // Look for the page block div with matching ID in the HTML
    // The format is: <div data-type="page-block" data-id="..." data-title="..." data-page-content="...">
    const regex = new RegExp(
        `<div[^>]*data-type="page-block"[^>]*data-id="${pageId}"[^>]*>`,
        'i'
    );
    const match = html.match(regex);

    if (match) {
        const divTag = match[0];

        // Extract title
        const titleMatch = divTag.match(/data-title="([^"]*)"/);
        const title = titleMatch ? decodeURIComponent(titleMatch[1]) : 'Untitled';

        // Extract pageContent
        const contentMatch = divTag.match(/data-page-content="([^"]*)"/);
        const pageContent = contentMatch ? decodeURIComponent(contentMatch[1]) : '';

        return { title, pageContent };
    }

    return null;
}

// Update page block content in the parent note's HTML
function updatePageBlockInHtml(html: string, pageId: string, newTitle: string, newContent: string): string {
    const escapedTitle = encodeURIComponent(newTitle);
    const escapedContent = encodeURIComponent(newContent);

    // Find and replace the page block div with updated attributes
    const regex = new RegExp(
        `(<div[^>]*data-type="page-block"[^>]*data-id="${pageId}"[^>]*)data-title="[^"]*"([^>]*)data-page-content="[^"]*"`,
        'gi'
    );

    let updated = html.replace(regex, `$1data-title="${escapedTitle}"$2data-page-content="${escapedContent}"`);

    // If no replacement happened, try alternative patterns
    if (updated === html) {
        // Try updating just the content attribute
        const contentOnlyRegex = new RegExp(
            `(<div[^>]*data-type="page-block"[^>]*data-id="${pageId}"[^>]*)data-page-content="[^"]*"`,
            'gi'
        );
        updated = html.replace(contentOnlyRegex, `$1data-page-content="${escapedContent}"`);
    }

    return updated;
}

export function SubPageClient() {
    const params = useParams();
    const router = useRouter();
    const noteId = params.id as string;
    const pageId = params.pageId as string;

    const [parentNote, setParentNote] = useState<Note | null>(null);
    const [pageTitle, setPageTitle] = useState('Untitled');
    const [pageContent, setPageContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const initialLoadDone = useRef(false);

    // Load parent note and extract page block data
    useEffect(() => {
        async function loadData() {
            try {
                const note = await getNote(noteId);
                if (note) {
                    setParentNote(note);

                    // Extract the page block data from the parent note's content
                    const pageData = extractPageBlockFromHtml(note.content, pageId);
                    if (pageData) {
                        setPageTitle(pageData.title);
                        setPageContent(pageData.pageContent);
                    }
                    initialLoadDone.current = true;
                } else {
                    router.push('/');
                }
            } catch (error) {
                console.error('Failed to load sub-page:', error);
                router.push('/');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [noteId, pageId, router]);

    // Save sub-page content back to parent note
    const saveSubPage = useCallback(async (newTitle: string, newContent: string) => {
        if (!parentNote || !initialLoadDone.current) return;

        setSaveStatus('saving');
        try {
            // Update the page block in the parent note's content
            const updatedContent = updatePageBlockInHtml(parentNote.content, pageId, newTitle, newContent);

            console.log('[SubPage] Saving content to parent note...');
            await updateNote(noteId, { content: updatedContent });

            // Update local parent note state
            setParentNote(prev => prev ? { ...prev, content: updatedContent } : null);

            setSaveStatus('saved');
            console.log('[SubPage] Content saved successfully');
        } catch (error) {
            console.error('Failed to save sub-page:', error);
            setSaveStatus('unsaved');
        }
    }, [parentNote, noteId, pageId]);

    // Debounced auto-save
    useEffect(() => {
        if (!parentNote || loading || !initialLoadDone.current) return;

        setSaveStatus('unsaved');
        const timer = setTimeout(() => {
            saveSubPage(pageTitle, pageContent);
        }, 1500);

        return () => clearTimeout(timer);
    }, [pageContent, pageTitle, loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/40">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/notes/${noteId}`}>
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Back to note
                            </Button>
                        </Link>
                    </div>

                    {/* Save Status */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {saveStatus === 'saving' && (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <Check className="w-3 h-3 text-green-500" />
                                <span>Saved</span>
                            </>
                        )}
                        {saveStatus === 'unsaved' && (
                            <>
                                <Cloud className="w-3 h-3" />
                                <span>Unsaved changes</span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {/* Title */}
                    <div className="mb-6">
                        <Input
                            value={pageTitle}
                            onChange={(e) => setPageTitle(e.target.value)}
                            placeholder="Untitled"
                            className="text-3xl font-bold border-none shadow-none px-0 focus-visible:ring-0 bg-transparent"
                        />
                    </div>

                    {/* Editor */}
                    <div className="min-h-[400px]">
                        <MarkdownEditor
                            content={pageContent}
                            onChange={setPageContent}
                            editable={true}
                            placeholder="Start writing in this sub-page..."
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
