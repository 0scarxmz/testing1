'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface ScreenshotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotPath: string | null | undefined;
}

export function ScreenshotModal({ open, onOpenChange, screenshotPath }: ScreenshotModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!screenshotPath) {
    return null;
  }

  // Convert file path to file:// URL for Electron
  // Windows paths need proper normalization
  const imageUrl = screenshotPath.startsWith('http') 
    ? screenshotPath 
    : (() => {
        // Normalize path: convert backslashes to forward slashes
        let normalizedPath = screenshotPath.replace(/\\/g, '/');
        // Ensure it starts with file:// (three slashes for absolute paths)
        if (!normalizedPath.startsWith('file://')) {
          normalizedPath = `file:///${normalizedPath}`;
        }
        return normalizedPath;
      })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-none">
        <DialogDescription className="sr-only">
          Full-size screenshot preview
        </DialogDescription>
        <div className="relative w-full h-full flex items-center justify-center">
          {!imageError ? (
            <img
              src={imageUrl}
              alt="Screenshot"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Failed to load screenshot
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

