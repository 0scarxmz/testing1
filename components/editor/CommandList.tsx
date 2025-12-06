'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { CommandItem } from './SlashCommand';

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

export const CommandList = forwardRef((props: CommandListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler();
                return true;
            }

            if (event.key === 'ArrowDown') {
                downHandler();
                return true;
            }

            if (event.key === 'Enter') {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    if (props.items.length === 0) {
        return null;
    }

    return (
        <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg overflow-hidden min-w-[280px] max-h-[320px] overflow-y-auto">
            <div className="p-1">
                {props.items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.title}
                            onClick={() => selectItem(index)}
                            className={`
                flex items-center gap-3 w-full px-3 py-2 text-left rounded-md transition-colors
                ${index === selectedIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                                }
              `}
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-secondary/50 shrink-0">
                                <Icon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{item.title}</span>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

CommandList.displayName = 'CommandList';
