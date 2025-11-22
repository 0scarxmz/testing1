'use client';

import { Briefcase, User, Heart, Calendar, BookOpen, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export function QuoteWidget() {
    return (
        <div className="bg-secondary/50 p-6 rounded-xl mb-8 border border-border">
            <div className="flex items-start gap-3">
                <span className="text-2xl">🌱</span>
                <div>
                    <p className="font-serif italic text-lg text-foreground/80 mb-2">
                        "today is the start of a new beginning," <span className="text-muted-foreground">she whispers.</span> "i will be softer, i will be better, i will be greater."
                    </p>
                </div>
            </div>
        </div>
    );
}

export function NavWidget() {
    const links = [
        { icon: Briefcase, label: 'work', href: '/?tag=work', color: 'text-chart-4' },
        { icon: User, label: 'personal', href: '/?tag=personal', color: 'text-chart-3' },
        { icon: Heart, label: 'life goals', href: '/?tag=goals', color: 'text-chart-2' },
        { icon: BookOpen, label: 'journal', href: '/?tag=journal', color: 'text-chart-5' },
    ];

    return (
        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">🌿</span> navigation
            </h3>
            <div className="space-y-2">
                {links.map((link) => (
                    <Link
                        key={link.label}
                        href={link.href}
                        className="flex items-center gap-3 p-2 hover:bg-background rounded-lg transition-colors group"
                    >
                        <link.icon className={`h-4 w-4 ${link.color}`} />
                        <span className="font-medium text-foreground/80 group-hover:text-foreground font-mono text-sm">
                            | {link.label}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function WeekViewWidget() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay(); // 0 is Sunday
    // Adjust so Mon is 0, Sun is 6
    const adjustedToday = today === 0 ? 6 : today - 1;

    return (
        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">📅</span> week view
            </h3>
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                    <div
                        key={day}
                        className={`
              flex flex-col items-center justify-center p-2 rounded-lg text-xs
              ${index === adjustedToday
                                ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                                : 'hover:bg-background text-muted-foreground'
                            }
            `}
                    >
                        <span>{day}</span>
                        <div className={`h-1 w-1 rounded-full mt-1 ${index === adjustedToday ? 'bg-white' : 'bg-transparent'}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function UniversityWidget() {
    return (
        <div className="bg-secondary/30 p-4 rounded-xl border border-border">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <span className="text-primary">🎓</span> university
            </h3>
            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                    <span className="font-mono text-muted-foreground">CS101</span>
                    <span className="text-xs bg-chart-1/20 text-chart-1 px-2 py-0.5 rounded">Assignment</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                    <span className="font-mono text-muted-foreground">MATH202</span>
                    <span className="text-xs bg-chart-2/20 text-chart-2 px-2 py-0.5 rounded">Exam</span>
                </div>
            </div>
        </div>
    );
}
