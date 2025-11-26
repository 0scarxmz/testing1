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

export function SidebarSearch({ onSearchChange, onModeChange, searchMode = 'semantic' }: SidebarSearchProps) {
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
    <div className="px-3 py-2">
      <div className="relative group">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
        <Input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-8 h-7 text-xs bg-secondary/40 border-transparent focus:bg-background focus:border-primary/10 focus:ring-1 focus:ring-primary/10 transition-all rounded-sm shadow-none placeholder:text-muted-foreground/60"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 hover:bg-transparent"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
      {/* Hidden mode toggle - defaulting to semantic */}
      <div className="hidden">
        <button onClick={() => handleModeChange('semantic')} />
      </div>
    </div>
  );
}

