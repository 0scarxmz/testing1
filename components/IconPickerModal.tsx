'use client';

import { useState } from 'react';
import { Upload, X, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IconPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectEmoji: (emoji: string) => void;
    onUploadImage: (path: string) => void;
    onReset: () => void;
}

const EMOJI_CATEGORIES = {
    work: ['📝', '📄', '📋', '📌', '📍', '🖇️', '⚡', '🔖', '💼', '📊', '📈', '📉'],
    creative: ['🎨', '✨', '💡', '⭐', '🌟', '💫', '🔥', '🎯', '🎪', '🎭'],
    nature: ['🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🍀', '🌿', '🌱', '🌲'],
    objects: ['📚', '📖', '📕', '📗', '📘', '📙', '🗂️', '📦', '🎁', '🏆', '🥇', '⏰'],
    hearts: ['❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '💗', '💖'],
    symbols: ['✅', '⚠️', '🚀', '💎', '🔔', '🎵', '🎸', '🎹', '🎤', '🎧']
};

export function IconPickerModal({ isOpen, onClose, onSelectEmoji, onUploadImage, onReset }: IconPickerModalProps) {
    const [activeTab, setActiveTab] = useState<'emoji' | 'upload'>('emoji');
    const [customEmoji, setCustomEmoji] = useState('');

    if (!isOpen) return null;

    async function handleFileUpload() {
        if (typeof window === 'undefined' || !(window as any).desktopAPI) {
            console.error('desktopAPI is not available');
            return;
        }

        try {
            const selectedPath = await (window as any).desktopAPI.selectCoverImage();
            if (selectedPath) {
                onUploadImage(selectedPath);
                onClose();
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
        }
    }

    function handleEmojiClick(emoji: string) {
        onSelectEmoji(emoji);
        onClose();
    }

    function handleCustomEmojiSubmit() {
        if (customEmoji.trim()) {
            onSelectEmoji(customEmoji.trim());
            setCustomEmoji('');
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-background border border-border rounded-2xl shadow-2xl w-[500px] max-h-[600px] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-semibold">Customize Note Icon</h2>
                        <p className="text-sm text-muted-foreground mt-1">Choose an emoji or upload a custom image for your note icon</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 px-6 pt-4">
                    <button
                        onClick={() => setActiveTab('emoji')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'emoji'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-secondary/50 hover:bg-secondary'
                            }`}
                    >
                        <Smile className="w-4 h-4" />
                        Emoji
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'upload'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-secondary/50 hover:bg-secondary'
                            }`}
                    >
                        <Upload className="w-4 h-4" />
                        Upload Image
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'emoji' ? (
                        <div className="space-y-6">
                            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                                <div key={category}>
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">
                                        {category}
                                    </h3>
                                    <div className="grid grid-cols-8 gap-2">
                                        {emojis.map((emoji, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleEmojiClick(emoji)}
                                                className="text-3xl p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                                                title={emoji}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Custom Emoji Input */}
                            <div className="pt-4 border-t border-border">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    Or enter any emoji:
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customEmoji}
                                        onChange={(e) => setCustomEmoji(e.target.value)}
                                        placeholder="Paste emoji here..."
                                        className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCustomEmojiSubmit();
                                            }
                                        }}
                                    />
                                    <Button onClick={handleCustomEmojiSubmit} disabled={!customEmoji.trim()}>
                                        Use
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-full max-w-md border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors">
                                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground mb-6">
                                    Upload a custom image (PNG, JPG, GIF, WebP)
                                </p>
                                <Button onClick={handleFileUpload} size="lg">
                                    Choose File
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onReset();
                            onClose();
                        }}
                        className="text-destructive hover:bg-destructive/10"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Reset to Default
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
