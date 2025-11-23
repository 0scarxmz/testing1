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
    <div className="p-4 space-y-3">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <Input
          type="text"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9 h-9 text-sm bg-secondary/50 border-transparent focus:bg-background focus:border-primary/20 focus:ring-1 focus:ring-primary/20 transition-all rounded-md shadow-sm"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-transparent"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>

      <div className="flex p-1 bg-secondary/30 rounded-lg">
        <button
          type="button"
          onClick={() => handleModeChange('keyword')}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${searchMode === 'keyword'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
        >
          Keyword
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('semantic')}
          className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${searchMode === 'semantic'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
        >
          AI Semantic
        </button>
      </div>
    </div>
  );
}

