'use client';

import { useState, KeyboardEvent, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAddTag() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue('');
      setIsInputVisible(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === 'Escape') {
      setInputValue('');
      setIsInputVisible(false);
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    onChange(tags.filter(tag => tag !== tagToRemove));
  }

  function handleShowInput() {
    setIsInputVisible(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-secondary rounded-md"
        >
          #{tag}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag)}
            className="hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {isInputVisible ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!inputValue.trim()) {
                setIsInputVisible(false);
              }
            }}
            placeholder={placeholder}
            className="h-7 w-24 text-xs"
          />
          {inputValue.trim() && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleAddTag}
              className="h-7 px-2"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleShowInput}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Tag
        </button>
      )}
    </div>
  );
}

