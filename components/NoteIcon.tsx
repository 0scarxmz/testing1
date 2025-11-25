'use client';

import { useState, useEffect } from 'react';
import { IconPickerModal } from './IconPickerModal';

interface NoteIconProps {
    noteId: string;
    iconPath?: string | null;
    iconEmoji?: string | null;
    editable?: boolean;
    onChange: (data: { path?: string | null; emoji?: string | null }) => void;
}

export function NoteIcon({ noteId, iconPath, iconEmoji, editable = false, onChange }: NoteIconProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);

    function normalizeFilePath(filePath: string): string {
        if (!filePath) return '';
        if (filePath.startsWith('http')) return filePath;

        let normalizedPath = filePath.replace(/\\/g, '/');
        if (!normalizedPath.startsWith('file://')) {
            if (normalizedPath.startsWith('/')) {
                normalizedPath = `file://${normalizedPath}`;
            } else {
                normalizedPath = `file:///${normalizedPath}`;
            }
        }
        return normalizedPath;
    }

    async function handleUploadImage(selectedPath: string) {
        if (typeof window === 'undefined' || !(window as any).desktopAPI) {
            console.error('desktopAPI is not available');
            return;
        }

        try {
            const savedPath = await (window as any).desktopAPI.saveNoteIcon(selectedPath, noteId);
            if (savedPath) {
                onChange({ path: savedPath, emoji: null });
            }
        } catch (error) {
            console.error('Failed to save note icon:', error);
        }
    }

    function handleSelectEmoji(emoji: string) {
        onChange({ emoji, path: null });
    }

    function handleReset() {
        onChange({ emoji: null, path: null });
    }

    // Display custom image
    if (iconPath && !imageError) {
        return (
            <>
                <div
                    className="relative group inline-block"
                    onMouseEnter={() => editable && setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={() => editable && setIsModalOpen(true)}
                >
                    <div className={`text-7xl drop-shadow-sm ${editable ? 'cursor-pointer' : ''} transition-opacity`}>
                        <img
                            src={normalizeFilePath(iconPath)}
                            alt="Note Icon"
                            className="w-20 h-20 object-cover rounded-xl"
                            onError={() => setImageError(true)}
                        />
                    </div>
                    {editable && isHovered && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-xl flex items-center justify-center">
                            <span className="text-white text-xs">Click to change</span>
                        </div>
                    )}
                </div>
                {editable && (
                    <IconPickerModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSelectEmoji={handleSelectEmoji}
                        onUploadImage={handleUploadImage}
                        onReset={handleReset}
                    />
                )}
            </>
        );
    }

    // Display emoji (custom or default)
    const displayEmoji = iconEmoji || '📝';

    return (
        <>
            <div
                className={`text-7xl drop-shadow-sm ${editable ? 'cursor-pointer hover:opacity-80' : ''} transition-opacity inline-block`}
                onClick={() => editable && setIsModalOpen(true)}
                title={editable ? 'Click to customize icon' : undefined}
            >
                {displayEmoji}
            </div>
            {editable && (
                <IconPickerModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSelectEmoji={handleSelectEmoji}
                    onUploadImage={handleUploadImage}
                    onReset={handleReset}
                />
            )}
        </>
    );
}
