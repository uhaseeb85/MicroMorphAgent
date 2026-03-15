import React, { useEffect, useRef } from 'react';
import type { ActivityItem } from '../../store/analysisStore';

interface ActivityLogProps {
    activities: ActivityItem[];
}

const typeConfig = {
    file: { badge: 'text-sky-700 dark:text-sky-200 bg-sky-500/10 border-sky-500/15', label: 'FILE' },
    git: { badge: 'text-amber-700 dark:text-amber-200 bg-amber-500/10 border-amber-500/15', label: 'GIT' },
    llm: { badge: 'text-violet-700 dark:text-violet-200 bg-violet-500/10 border-violet-500/15', label: 'AI' },
    graph: { badge: 'text-emerald-700 dark:text-emerald-200 bg-emerald-500/10 border-emerald-500/15', label: 'GRAPH' },
    pom: { badge: 'text-cyan-700 dark:text-cyan-200 bg-cyan-500/10 border-cyan-500/15', label: 'POM' },
    success: { badge: 'text-emerald-700 dark:text-emerald-200 bg-emerald-500/10 border-emerald-500/15', label: 'DONE' },
    info: { badge: 'text-muted-foreground bg-background/60 border-border/60', label: 'INFO' }
};

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
    const config = typeConfig[activity.type];

    return (
        <div className="neo-panel-soft flex items-start gap-3 p-3.5 rounded-2xl">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded-full border ${config.badge}`}>
                        {config.label}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground">
                        {formatTime(activity.timestamp)}
                    </span>
                    {activity.status === 'success' && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                    {activity.status === 'pending' && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                </div>
                <p className="text-sm font-medium tracking-tight text-foreground/85 truncate">
                    {activity.message}
                </p>
            </div>
        </div>
    );
}

export function ActivityLog({ activities }: ActivityLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [activities.length]);

    return (
        <div className="neo-panel rounded-[2rem] overflow-hidden">
            <div className="px-5 py-4 border-b neo-divider flex items-center justify-between bg-transparent">
                <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4 bg-foreground rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                        Real-time Logs
                    </span>
                </div>
                <span className="neo-badge text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-xl text-muted-foreground">
                    {activities.length} EVENTS
                </span>
            </div>

            <div ref={scrollRef} className="max-h-[380px] overflow-y-auto p-4 space-y-3 scroll-smooth">
                {activities.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Awaiting engine output...
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
