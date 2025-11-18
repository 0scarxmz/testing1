'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SidebarSearchProps {
  onSearchChange: (query: string) => void;
}

export function SidebarSearch({ onSearchChange }: SidebarSearchProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    onSearchChange(query);
  }, [query]);

  function handleClear() {
    setQuery('');
  }

  return (
    <div className="relative p-4 border-b">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="🔍 Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

