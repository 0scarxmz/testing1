'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAllTags } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { SidebarSearch } from './sidebar-search';
import { X } from 'lucide-react';

type SearchMode = 'keyword' | 'semantic';

interface SidebarProps {
  onTagClick?: (tag: string) => void;
  onSearchChange?: (query: string) => void;
  onModeChange?: (mode: SearchMode) => void;
  searchQuery?: string;
  activeTag?: string | null;
  searchMode?: SearchMode;
}

export function Sidebar({
  onTagClick,
  onSearchChange,
  onModeChange,
  searchQuery: externalSearchQuery,
  activeTag: externalActiveTag,
  searchMode: externalSearchMode
}: SidebarProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [internalActiveTag, setInternalActiveTag] = useState<string | null>(null);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSearchMode, setInternalSearchMode] = useState<SearchMode>('keyword');

  // Use external props if provided, otherwise use internal state
  const activeTag = externalActiveTag !== undefined ? externalActiveTag : internalActiveTag;
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const searchMode = externalSearchMode !== undefined ? externalSearchMode : internalSearchMode;

  useEffect(() => {
    loadTags();
  }, []);

  // Reload tags periodically to catch new tags
  useEffect(() => {
    const interval = setInterval(() => {
      loadTags();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadTags() {
    try {
      const allTags = await getAllTags();
      setTags(allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  const handleTagClick = useCallback((tag: string) => {
    if (activeTag === tag) {
      if (externalActiveTag === undefined) {
        setInternalActiveTag(null);
      }
      if (onTagClick) onTagClick('');
    } else {
      if (externalActiveTag === undefined) {
        setInternalActiveTag(tag);
      }
      if (onTagClick) onTagClick(tag);
    }
  }, [activeTag, onTagClick, externalActiveTag]);

  function handleClearFilter() {
    if (externalActiveTag === undefined) {
      setInternalActiveTag(null);
    }
    if (onTagClick) onTagClick('');
  }

  function handleSearchChange(query: string) {
    if (externalSearchQuery === undefined) {
      setInternalSearchQuery(query);
    }
    if (onSearchChange) onSearchChange(query);
  }

  function handleModeChange(mode: SearchMode) {
    if (externalSearchMode === undefined) {
      setInternalSearchMode(mode);
    }
    if (onModeChange) onModeChange(mode);
  }

  return (
    <div className="w-72 border-r border-border/40 bg-sidebar flex flex-col h-screen font-sans">
      <div className="p-4 pb-0">
        <div className="flex items-center gap-2 px-2 mb-4 opacity-80">
          <div className="h-5 w-5 rounded bg-foreground text-background flex items-center justify-center text-[10px] font-bold">N</div>
          <span className="font-semibold text-sm">Noteshot</span>
        </div>
      </div>

      <SidebarSearch
        onSearchChange={handleSearchChange}
        onModeChange={handleModeChange}
        searchMode={searchMode}
      />

      <div className="flex-1 overflow-y-auto py-2">
        {tags.length > 0 && (
          <div className="px-3">
            <div className="flex items-center justify-between px-2 mb-2 mt-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h2>
              {activeTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="h-5 text-[10px] px-1.5 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`
                    w-full text-left text-sm px-2 py-1.5 rounded-md transition-all duration-200 flex items-center gap-2 group
                    ${activeTag === tag
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }
                  `}
                >
                  <span className="opacity-50 text-xs">#</span>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/40 text-[10px] text-muted-foreground text-center">
        ⌘+K to search • ⌘+N for new note
      </div>
    </div>
  );
}

