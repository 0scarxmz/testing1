'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

type SearchMode = 'keyword' | 'semantic';

interface SidebarSearchProps {
  onSearchChange: (query: string) => void;
  onModeChange?: (mode: SearchMode) => void;
  searchMode?: SearchMode;
}

export function SidebarSearch({ onSearchChange, onModeChange, searchMode = 'keyword' }: SidebarSearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    onSearchChange(query);
  }, [query]);

  function handleClear() {
    setQuery('');
  }

  function handleModeChange(mode: SearchMode) {
    if (onModeChange) {
      onModeChange(mode);
    }
  }

  return (
    <div className="p-6 border-b space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="🔍 Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-11 pr-11 h-11 text-base"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => handleModeChange('keyword')}
          className={`px-3 py-1.5 rounded transition-colors ${
            searchMode === 'keyword'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          Keyword search
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('semantic')}
          className={`px-3 py-1.5 rounded transition-colors ${
            searchMode === 'semantic'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          AI Semantic Search
        </button>
      </div>
    </div>
  );
}

