'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X, Upload } from 'lucide-react';

interface CoverImageProps {
  coverImagePath?: string | null;
  onChange: (path: string | null) => void;
  noteId: string;
}

function normalizeFilePath(filePath: string): string {
  if (filePath.startsWith('http')) {
    return filePath;
  }
  // Normalize path: convert backslashes to forward slashes
  let normalizedPath = filePath.replace(/\\/g, '/');
  // Ensure it starts with file:// (three slashes for absolute paths)
  if (!normalizedPath.startsWith('file://')) {
    normalizedPath = `file:///${normalizedPath}`;
  }
  return normalizedPath;
}

export function CoverImage({ coverImagePath, onChange, noteId }: CoverImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAddCover = async () => {
    if (typeof window === 'undefined' || !(window as any).desktopAPI) {
      console.error('desktopAPI is not available');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Select file
      const selectedPath = await (window as any).desktopAPI.selectCoverImage();
      if (!selectedPath) {
        setIsLoading(false);
        return; // User cancelled
      }

      // Step 2: Save file
      const savedPath = await (window as any).desktopAPI.saveCoverImage(selectedPath, noteId);
      if (savedPath) {
        onChange(savedPath);
      } else {
        console.error('[CoverImage] Failed to save cover image - savedPath is null/undefined');
      }
    } catch (error) {
      console.error('Failed to add cover image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeCover = async () => {
    // Delete old image first
    if (coverImagePath) {
      try {
        if (typeof window !== 'undefined' && (window as any).desktopAPI) {
          await (window as any).desktopAPI.deleteCoverImage(coverImagePath);
        }
      } catch (error) {
        console.error('Failed to delete old cover image:', error);
      }
    }

    // Then add new one
    await handleAddCover();
  };

  const handleRemoveCover = async () => {
    if (!coverImagePath) return;

    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && (window as any).desktopAPI) {
        const deleted = await (window as any).desktopAPI.deleteCoverImage(coverImagePath);
        if (deleted) {
          onChange(null);
        }
      }
    } catch (error) {
      console.error('Failed to remove cover image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // No cover image - show "Add cover" button
  if (!coverImagePath) {
    return (
      <div className="w-full h-[280px] bg-muted/30 border-b border-dashed border-muted-foreground/20 flex items-center justify-center">
        <Button
          variant="outline"
          onClick={handleAddCover}
          disabled={isLoading}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {isLoading ? 'Loading...' : 'Add cover'}
        </Button>
      </div>
    );
  }

  // Has cover image - show image with hover overlay
  const imageUrl = normalizeFilePath(coverImagePath);

  return (
    <div
      className="relative w-full h-[280px] overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt="Cover"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
          Failed to load cover image
        </div>
      )}

      {/* Hover overlay with controls */}
      {isHovered && !isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleChangeCover}
            disabled={isLoading}
            className="gap-2"
          >
            <Image className="h-4 w-4" />
            Change
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveCover}
            disabled={isLoading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Remove
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      )}

      {/* Subtle gradient overlay at bottom for text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
}

