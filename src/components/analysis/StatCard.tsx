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
    blue: {
        bg: 'hsl(220 80% 96%)',
        border: 'hsl(220 70% 88%)',
        iconBg: 'hsl(220 75% 60%)',
        text: 'hsl(220 70% 45%)',
        pulse: 'hsl(220 80% 60%)'
    },
    purple: {
        bg: 'hsl(244 80% 96%)',
        border: 'hsl(244 70% 88%)',
        iconBg: 'hsl(244 75% 62%)',
        text: 'hsl(244 70% 50%)',
        pulse: 'hsl(244 80% 60%)'
    },
    green: {
        bg: 'hsl(140 60% 96%)',
        border: 'hsl(140 50% 88%)',
        iconBg: 'hsl(140 55% 45%)',
        text: 'hsl(140 55% 35%)',
        pulse: 'hsl(140 60% 50%)'
    },
    orange: {
        bg: 'hsl(35 90% 96%)',
        border: 'hsl(35 80% 88%)',
        iconBg: 'hsl(35 90% 50%)',
        text: 'hsl(35 90% 40%)',
        pulse: 'hsl(35 90% 55%)'
    },
    pink: {
        bg: 'hsl(330 80% 96%)',
        border: 'hsl(330 70% 88%)',
        iconBg: 'hsl(330 75% 60%)',
        text: 'hsl(330 70% 50%)',
        pulse: 'hsl(330 80% 60%)'
    }
};

export function StatCard({ icon, label, value, total, suffix = '', color, isActive, pulseText }: StatCardProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const colors = colorMap[color];

    // Animate the number counting up
    useEffect(() => {
        if (value === displayValue) return;

        const duration = 600;
        const startTime = Date.now();
        const startValue = displayValue;
        const endValue = value;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (endValue - startValue) * easeProgress);
            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    const percentage = total && total > 0 ? Math.round((value / total) * 100) : 0;

    return (
        <div
            className="rounded-2xl p-5 transition-all duration-300"
            style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                boxShadow: isActive ? `0 0 20px ${colors.pulse}30` : 'none'
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300"
                    style={{ background: colors.iconBg }}
                >
                    <div className="text-white">{icon}</div>
                </div>
                {isActive && pulseText && (
                    <div className="flex items-center gap-1.5">
                        <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ background: colors.pulse }}
                        />
                        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.text }}>
                            {pulseText}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight" style={{ color: 'hsl(230 25% 15%)' }}>
                        {displayValue.toLocaleString()}
                    </span>
                    {suffix && (
                        <span className="text-sm font-medium" style={{ color: colors.text }}>
                            {suffix}
                        </span>
                    )}
                </div>

                <p className="text-xs font-medium" style={{ color: 'hsl(230 15% 50%)' }}>
                    {label}
                </p>
            </div>

            {total !== undefined && total > 0 && (
                <div className="mt-3">
                    <div
                        className="w-full h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.5)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(90deg, ${colors.iconBg}, ${colors.pulse})`
                            }}
                        />
                    </div>
                    <p className="text-[10px] mt-1.5 font-medium" style={{ color: colors.text }}>
                        {percentage}% of {total.toLocaleString()}
                    </p>
                </div>
            )}
        </div>
    );
}
