'use client';

import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';

interface AppLogoProps {
    size?: 'sm' | 'md' | 'lg';
    editable?: boolean;
    className?: string;
}

export function AppLogo({ size = 'md', editable = false, className = '' }: AppLogoProps) {
    const [customLogo, setCustomLogo] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Size mappings
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-12 w-12',
        lg: 'h-16 w-16'
    };

    const iconSizeClasses = {
        sm: 'w-3 h-3',
        md: 'w-7 h-7',
        lg: 'w-10 h-10'
    };

    useEffect(() => {
        loadCustomLogo();
    }, []);

    async function loadCustomLogo() {
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.getAppLogo) {
            try {
                const logoPath = await (window as any).desktopAPI.getAppLogo();
                if (logoPath) {
                    setCustomLogo(logoPath);
                }
            } catch (error) {
                console.error('Failed to load custom logo:', error);
            }
        }
    }

    async function handleUploadLogo(e?: React.MouseEvent) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (!editable) {
            console.log('[AppLogo] Not editable, ignoring click');
            return;
        }

        console.log('[AppLogo] Upload clicked, checking desktopAPI...');

        if (typeof window === 'undefined' || !(window as any).desktopAPI?.uploadAppLogo) {
            console.error('[AppLogo] desktopAPI is not available');
            return;
        }

        try {
            console.log('[AppLogo] Calling uploadAppLogo...');
            const logoPath = await (window as any).desktopAPI.uploadAppLogo();
            console.log('[AppLogo] Upload result:', logoPath);
            if (logoPath) {
                setCustomLogo(logoPath);
            }
        } catch (error) {
            console.error('[AppLogo] Failed to upload logo:', error);
        }
    }

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

    const containerClass = `${sizeClasses[size]} rounded-xl flex items-center justify-center shadow-md overflow-hidden ${className}`;

    if (customLogo) {
        return (
            <div
                className={`${containerClass} relative group ${editable ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => editable && setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleUploadLogo}
            >
                <img
                    src={normalizeFilePath(customLogo)}
                    alt="App Logo"
                    className="w-full h-full object-cover"
                />
                {editable && isHovered && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px] transition-all">
                        <Upload className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>
        );
    }

    // Default SVG logo
    return (
        <div
            className={`${containerClass} bg-gradient-to-br from-blue-500 to-orange-500 ${editable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
            onClick={handleUploadLogo}
            title={editable ? 'Click to upload custom logo (GIF supported)' : undefined}
        >
            <svg className={`${iconSizeClasses[size]} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        </div>
    );
}
