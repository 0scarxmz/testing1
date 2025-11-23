'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Image, X, Upload } from 'lucide-react';

interface CoverImageProps {
  coverImagePath?: string | null;
  onChange: (path: string | null) => void;
  noteId: string;
  editable?: boolean;
}

function normalizeFilePath(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http')) {
    return filePath;
  }

  // Normalize path: convert backslashes to forward slashes
  let normalizedPath = filePath.replace(/\\/g, '/');

  // Handle spaces and special characters for URL
  // We need to encode the path parts but keep the slashes
  // normalizedPath = normalizedPath.split('/').map(part => encodeURIComponent(part)).join('/');

  // Ensure it starts with file:// (three slashes for absolute paths)
  if (!normalizedPath.startsWith('file://')) {
    if (normalizedPath.startsWith('/')) {
      normalizedPath = `file://${normalizedPath}`;
    } else {
      normalizedPath = `file:///${normalizedPath}`;
    }
  }

  return normalizedPath;
}

export function CoverImage({ coverImagePath, onChange, noteId, editable = true }: CoverImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddCover = async () => {
    if (!editable) return;

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

      console.log('[CoverImage] Selected path:', selectedPath);

      // Step 2: Save file
      const savedPath = await (window as any).desktopAPI.saveCoverImage(selectedPath, noteId);
      console.log('[CoverImage] Saved path:', savedPath);

      if (savedPath) {
        // Force a small delay to ensure file system write is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[CoverImage] About to call onChange with savedPath:', savedPath);
        onChange(savedPath);
        console.log('[CoverImage] onChange called successfully');
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
    if (!editable) return;
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
    if (!editable) return;
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

  // No cover image
  if (!coverImagePath) {
    if (!editable) return null; // Don't show anything in read mode if no cover

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

  // Reset imageLoaded when coverImagePath changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [coverImagePath]);

  return (
    <div
      className="relative w-full h-[280px] overflow-hidden group bg-muted/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Loading Placeholder / Blur Effect */}
      <div
        className={`absolute inset-0 bg-muted transition-opacity duration-700 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ backdropFilter: 'blur(10px)' }}
      />

      {!imageError ? (
        <img
          src={imageUrl}
          alt="Cover"
          className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
          Failed to load cover image
        </div>
      )}

      {/* Hover overlay with controls - ONLY IF EDITABLE */}
      {isHovered && !isLoading && editable && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-2 transition-all duration-300 animate-in fade-in">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleChangeCover}
            disabled={isLoading}
            className="gap-2 shadow-lg hover:scale-105 transition-transform"
          >
            <Image className="h-4 w-4" />
            Change
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveCover}
            disabled={isLoading}
            className="gap-2 shadow-lg hover:scale-105 transition-transform"
          >
            <X className="h-4 w-4" />
            Remove
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-10">
          <div className="text-white font-medium animate-pulse">Loading...</div>
        </div>
      )}

      {/* Subtle gradient overlay at bottom for text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/80 via-background/20 to-transparent pointer-events-none" />
    </div>
  );
}

