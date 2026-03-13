import React, { useEffect, useRef } from 'react';
import type { ActivityItem } from '../../store/analysisStore';

interface ActivityLogProps {
    activities: ActivityItem[];
}

const typeConfig = {
    file: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
            </svg>
        ),
        bg: 'hsl(220 80% 96%)',
        color: 'hsl(220 70% 50%)',
        label: 'FILE'
    },
    git: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <line x1="1.05" y1="12" x2="7" y2="12" />
                <line x1="17.01" y1="12" x2="22.96" y2="12" />
            </svg>
        ),
        bg: 'hsl(35 90% 96%)',
        color: 'hsl(35 90% 45%)',
        label: 'GIT'
    },
    llm: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" />
                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
        ),
        bg: 'hsl(244 80% 96%)',
        color: 'hsl(244 70% 55%)',
        label: 'AI'
    },
    graph: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
        ),
        bg: 'hsl(140 60% 96%)',
        color: 'hsl(140 55% 40%)',
        label: 'GRAPH'
    },
    pom: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                <path d="M14 2v6h6" />
                <path d="M2 15h10" />
                <path d="M5 12v6" />
                <path d="M8 12v6" />
                <path d="M11 12v6" />
            </svg>
        ),
        bg: 'hsl(0 70% 96%)',
        color: 'hsl(0 60% 50%)',
        label: 'POM'
    },
    success: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        ),
        bg: 'hsl(140 60% 96%)',
        color: 'hsl(140 55% 40%)',
        label: 'DONE'
    },
    info: {
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        ),
        bg: 'hsl(230 20% 96%)',
        color: 'hsl(230 15% 50%)',
        label: 'INFO'
    }
};

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
    const config = typeConfig[activity.type];

    return (
        <div
            className="flex items-start gap-3 p-3 rounded-xl transition-all duration-300 animate-in slide-in-from-left-2 fade-in"
            style={{
                background: 'white',
                border: '1px solid hsl(230 20% 90%)'
            }}
        >
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: config.bg, color: config.color }}
            >
                {config.icon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span
                        className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: config.bg, color: config.color }}
                    >
                        {config.label}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'hsl(230 15% 60%)' }}>
                        {formatTime(activity.timestamp)}
                    </span>
                    {activity.status === 'success' && (
                        <span className="ml-auto">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(140 55% 45%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </span>
                    )}
                    {activity.status === 'pending' && (
                        <span className="ml-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                        </span>
                    )}
                    {activity.status === 'error' && (
                        <span className="ml-auto">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(0 70% 50%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </span>
                    )}
                </div>
                <p className="text-sm truncate" style={{ color: 'hsl(230 20% 25%)' }}>
                    {activity.message}
                </p>
            </div>
        </div>
    );
}

export function ActivityLog({ activities }: ActivityLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to top when new activities are added
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
    }, [activities.length]);

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'hsl(230 30% 98%)', border: '1px solid hsl(230 20% 88%)' }}
        >
            <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: 'hsl(230 20% 90%)', background: 'white' }}
            >
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(244 70% 55%)' }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(230 15% 45%)' }}>
                        Live Activity Log
                    </span>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'hsl(230 20% 95%)', color: 'hsl(230 15% 55%)' }}>
                    {activities.length} events
                </span>
            </div>

            <div
                ref={scrollRef}
                className="max-h-[320px] overflow-y-auto p-3 space-y-2"
                style={{ scrollBehavior: 'smooth' }}
            >
                {activities.length === 0 ? (
                    <div className="text-center py-8">
                        <div
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ background: 'hsl(230 20% 95%)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(230 15% 60%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        </div>
                        <p className="text-xs" style={{ color: 'hsl(230 15% 55%)' }}>
                            Waiting for activity...
                        </p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <ActivityItemComponent key={activity.id} activity={activity} />
                    ))
                )}
            </div>
        </div>
    );
}
