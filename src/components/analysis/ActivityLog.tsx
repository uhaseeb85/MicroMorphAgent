import React, { useEffect, useRef } from 'react';
import type { ActivityItem } from '../../store/analysisStore';

interface ActivityLogProps {
    activities: ActivityItem[];
}

const typeConfig = {
    file: { icon: null, bg: 'hsl(210 20% 96%)', color: 'hsl(215 15% 45%)', label: 'FILE' },
    git: { icon: null, bg: 'hsl(210 20% 96%)', color: 'hsl(215 15% 45%)', label: 'GIT' },
    llm: { icon: null, bg: 'hsl(210 20% 96%)', color: 'hsl(215 15% 45%)', label: 'AI' },
    graph: { icon: null, bg: 'hsl(210 20% 96%)', color: 'hsl(215 15% 45%)', label: 'GRAPH' },
    pom: { icon: null, bg: 'hsl(210 20% 96%)', color: 'hsl(215 15% 45%)', label: 'POM' },
    success: { icon: null, bg: 'hsl(140 60% 96%)', color: 'hsl(140 55% 40%)', label: 'DONE' },
    info: { icon: null, bg: 'hsl(210 20% 96%)', color: 'hsl(215 15% 45%)', label: 'INFO' }
};

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
    const config = typeConfig[activity.type];

    return (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border bg-white shadow-sm" style={{ borderColor: 'hsl(214 20% 92%)' }}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border" style={{ background: 'hsl(210 20% 98%)', color: 'hsl(215 15% 45%)', borderColor: 'hsl(214 20% 90%)' }}>
                        {config.label}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-400">
                        {formatTime(activity.timestamp)}
                    </span>
                    {activity.status === 'success' && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                    {activity.status === 'pending' && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                </div>
                <p className="text-sm font-medium tracking-tight text-slate-700 truncate">
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
        <div className="rounded-2xl overflow-hidden border bg-slate-50 shadow-sm" style={{ borderColor: 'hsl(214 20% 90%)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between bg-white" style={{ borderColor: 'hsl(214 20% 92%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4 bg-slate-900 rounded-full" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">
                        Real-time Logs
                    </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-slate-50 text-slate-500" style={{ borderColor: 'hsl(214 20% 90%)' }}>
                    {activities.length} EVENTS
                </span>
            </div>

            <div ref={scrollRef} className="max-h-[380px] overflow-y-auto p-4 space-y-3 scroll-smooth">
                {activities.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
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
