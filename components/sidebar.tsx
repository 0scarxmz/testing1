'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAllTags } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { SidebarSearch } from './sidebar-search';
import { NoteList } from './NoteList';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onTagClick?: (tag: string) => void;
}

export function Sidebar({ onTagClick }: SidebarProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    loadTags();
  }, []);

  // Reload tags when navigating back from a note (pathname changes)
  useEffect(() => {
    if (pathname === '/') {
      loadTags();
    }
  }, [pathname]);

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
      setActiveTag(null);
      if (onTagClick) onTagClick('');
    } else {
      setActiveTag(tag);
      if (onTagClick) onTagClick(tag);
    }
  }, [activeTag, onTagClick]);

  function handleClearFilter() {
    setActiveTag(null);
    if (onTagClick) onTagClick('');
  }

  return (
    <div className="w-80 border-r bg-background flex flex-col h-screen">
      <SidebarSearch onSearchChange={setSearchQuery} />
      
      <div className="flex-1 overflow-y-auto">
        {tags.length > 0 && (
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Tags</h2>
              {activeTag && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="h-6 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`
                    text-xs px-2 py-1 rounded-md transition-colors
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
        
        <div className="p-2">
          {(searchQuery || activeTag) && (
            <div className="text-xs text-muted-foreground px-2 mb-2">
              Notes (filtered)
            </div>
          )}
          <NoteList 
            searchQuery={searchQuery} 
            activeTag={activeTag} 
            onTagClick={handleTagClick}
            onNotesChange={loadTags}
          />
        </div>
      </div>
    </div>
  );
}

