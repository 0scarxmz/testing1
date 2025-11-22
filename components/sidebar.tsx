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
    <div className="w-80 border-r bg-background flex flex-col h-screen">
      <SidebarSearch 
        onSearchChange={handleSearchChange} 
        onModeChange={handleModeChange}
        searchMode={searchMode}
      />
      
      <div className="flex-1 overflow-y-auto">
        {tags.length > 0 && (
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Tags</h2>
              {activeTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="h-8 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`
                    text-sm px-3 py-1.5 rounded-md transition-colors
                    ${activeTag === tag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                    }
                  `}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

