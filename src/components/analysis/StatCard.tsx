import React, { useEffect, useState } from 'react';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    total?: number;
    suffix?: string;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'pink';
    isActive?: boolean;
    pulseText?: string;
}

const colorMap = {
    blue: { accent: 'bg-sky-500/15 text-sky-700 dark:text-sky-200', progress: 'bg-sky-500' },
    purple: { accent: 'bg-violet-500/15 text-violet-700 dark:text-violet-200', progress: 'bg-violet-500' },
    green: { accent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200', progress: 'bg-emerald-500' },
    orange: { accent: 'bg-amber-500/15 text-amber-700 dark:text-amber-200', progress: 'bg-amber-500' },
    pink: { accent: 'bg-rose-500/15 text-rose-700 dark:text-rose-200', progress: 'bg-rose-500' }
};

export function StatCard({ icon, label, value, total, suffix = '', color, isActive, pulseText }: StatCardProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const colors = colorMap[color];

    useEffect(() => {
        if (value === displayValue) return;
        const duration = 800;
        const startTime = Date.now();
        const startValue = displayValue;
        const endValue = value;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(startValue + (endValue - startValue) * easeProgress);
            setDisplayValue(current);
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);

    const percentage = total && total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div
            className={`neo-panel rounded-[1.75rem] p-6 transition-all ${isActive ? 'ring-1 ring-foreground/10' : ''}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'neo-button-primary' : `neo-inset ${colors.accent}`}`}
                >
                    <div>{icon}</div>
                </div>
                {isActive && (
                    <div className="neo-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {pulseText || 'Active'}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight text-foreground">
                        {displayValue.toLocaleString()}
                    </span>
                    {suffix && (
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            {suffix}
                        </span>
                    )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {label}
                </p>
            </div>

            {total !== undefined && total > 0 && (
                <div className="mt-5 space-y-2">
                    <div className="neo-inset w-full h-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-700 ease-out ${colors.progress}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        {percentage}% Completeness
                    </p>
                </div>
            )}
        </div>
    );
}
