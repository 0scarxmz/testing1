'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAllTags } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { SidebarSearch } from './sidebar-search';
import { X } from 'lucide-react';
import { AppLogo } from './AppLogo';

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
  const [internalSearchMode, setInternalSearchMode] = useState<SearchMode>('semantic');

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
    <div className="w-60 border-r border-border/30 bg-[#F7F7F5] dark:bg-[#252525] flex flex-col h-screen font-sans transition-colors duration-300">
      <div className="p-3 pb-0">
        <div className="flex items-center gap-2 px-2 mb-2 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <div className="scale-90 origin-left">
            <AppLogo size="sm" editable={false} />
          </div>
          <span className="font-medium text-sm text-foreground/90">Noteshot</span>
        </div>
      </div>

      <SidebarSearch
        onSearchChange={handleSearchChange}
        onModeChange={handleModeChange}
        searchMode={searchMode}
      />

      <div className="flex-1 overflow-y-auto py-1 scrollbar-hide">
        {tags.length > 0 && (
          <div className="px-2">
            <div className="flex items-center justify-between px-2 mb-1 mt-3 group">
              <h2 className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">Tags</h2>
              {activeTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="h-4 text-[10px] px-1 hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-[1px]">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`
                    w-full text-left text-xs px-2 py-1 rounded-sm transition-all duration-150 flex items-center gap-2 group
                    ${activeTag === tag
                      ? 'bg-black/5 dark:bg-white/10 text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                    }
                  `}
                >
                  <span className="opacity-40 text-[10px]">#</span>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User / Settings / Updates area placeholder to match Notion's bottom bar if desired, or just footer */}
      {/* <div className="p-3 border-t border-border/30">
          <div className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
             <Settings className="h-3.5 w-3.5" />
             <span className="text-xs">Settings</span>
          </div>
      </div> */}
    </div>
  );
}

