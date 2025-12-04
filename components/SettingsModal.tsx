'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const [autoScreenshot, setAutoScreenshot] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    async function loadSettings() {
        setLoading(true);
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.getSettings) {
            try {
                const enabled = await (window as any).desktopAPI.getSettings('autoScreenshot');
                setAutoScreenshot(enabled !== false); // Default to true if undefined
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
        setLoading(false);
    }

    async function toggleAutoScreenshot(checked: boolean) {
        setAutoScreenshot(checked);
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.updateSettings) {
            try {
                await (window as any).desktopAPI.updateSettings('autoScreenshot', checked);
            } catch (error) {
                console.error('Failed to update settings:', error);
                // Revert on error
                setAutoScreenshot(!checked);
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#F7F7F5] dark:bg-[#202020] border-border/40 text-foreground">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Settings
                    </DialogTitle>
                    <DialogDescription>
                        Manage your application preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="auto-screenshot" className="font-medium">
                                Auto-screenshot
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                Automatically take a screenshot when creating a Quick Note
                            </span>
                        </div>
                        <Switch
                            id="auto-screenshot"
                            checked={autoScreenshot}
                            onCheckedChange={toggleAutoScreenshot}
                            disabled={loading}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
