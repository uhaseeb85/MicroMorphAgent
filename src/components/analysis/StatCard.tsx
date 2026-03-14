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
    blue: { bg: 'white', border: 'hsl(214 20% 90%)', iconBg: 'hsl(222 25% 15%)', icon: 'white', text: 'hsl(215 15% 45%)', pulse: 'hsl(222 25% 15%)' },
    purple: { bg: 'white', border: 'hsl(214 20% 90%)', iconBg: 'hsl(222 25% 15%)', icon: 'white', text: 'hsl(215 15% 45%)', pulse: 'hsl(222 25% 15%)' },
    green: { bg: 'white', border: 'hsl(214 20% 90%)', iconBg: 'hsl(222 25% 15%)', icon: 'white', text: 'hsl(215 15% 45%)', pulse: 'hsl(222 25% 15%)' },
    orange: { bg: 'white', border: 'hsl(214 20% 90%)', iconBg: 'hsl(222 25% 15%)', icon: 'white', text: 'hsl(215 15% 45%)', pulse: 'hsl(222 25% 15%)' },
    pink: { bg: 'white', border: 'hsl(214 20% 90%)', iconBg: 'hsl(222 25% 15%)', icon: 'white', text: 'hsl(215 15% 45%)', pulse: 'hsl(222 25% 15%)' }
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
            className="rounded-2xl p-6 transition-all border shadow-sm"
            style={{
                background: 'white',
                borderColor: isActive ? 'hsl(222 25% 15%)' : 'hsl(214 20% 91%)',
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: isActive ? 'hsl(222 25% 15%)' : 'hsl(210 20% 96%)' }}
                >
                    <div style={{ color: isActive ? 'white' : 'hsl(215 15% 45%)' }}>{icon}</div>
                </div>
                {isActive && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-slate-50" style={{ borderColor: 'hsl(214 20% 90%)' }}>
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                            Active
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                        {displayValue.toLocaleString()}
                    </span>
                    {suffix && (
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            {suffix}
                        </span>
                    )}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {label}
                </p>
            </div>

            {total !== undefined && total > 0 && (
                <div className="mt-5 space-y-2">
                    <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className="h-full bg-slate-900 transition-all duration-700 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {percentage}% Completeness
                    </p>
                </div>
            )}
        </div>
    );
}
