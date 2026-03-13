import React from 'react';

interface ProgressBarProps {
    phase: number;
    progressMessage: string;
}

export function ProgressBar({ phase, progressMessage }: ProgressBarProps) {
    // Calculate progress percentage based on phase
    const totalPhases = 5;
    const phaseProgress = Math.max(0, Math.min(phase, totalPhases));
    const percentage = (phaseProgress / totalPhases) * 100;

    return (
        <div
            className="rounded-2xl p-6"
            style={{ background: 'white', border: '1px solid hsl(230 20% 88%)' }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {/* Animated logo */}
                    <div className="relative w-10 h-10">
                        <div
                            className="absolute inset-0 rounded-xl animate-ping opacity-20"
                            style={{ background: 'hsl(244 80% 60%)' }}
                        />
                        <div
                            className="relative w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, hsl(244 75% 62%), hsl(220 75% 68%))' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-lg font-black tracking-tight" style={{ color: 'hsl(230 25% 12%)' }}>
                            Analyzing Repository
                        </h2>
                        <p className="text-sm" style={{ color: 'hsl(230 15% 50%)' }}>
                            {progressMessage || 'Initializing...'}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: 'hsl(244 70% 55%)' }}>
                        {Math.round(percentage)}%
                    </span>
                    <p className="text-xs" style={{ color: 'hsl(230 15% 55%)' }}>
                        Phase {phase} of {totalPhases}
                    </p>
                </div>
            </div>

            {/* Main progress bar */}
            <div
                className="w-full h-3 rounded-full overflow-hidden"
                style={{ background: 'hsl(230 20% 93%)' }}
            >
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                        width: `${Math.max(5, percentage)}%`,
                        background: 'linear-gradient(90deg, hsl(244 75% 62%), hsl(220 75% 68%))'
                    }}
                >
                    {/* Animated shimmer effect */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            animation: 'shimmer 2s infinite'
                        }}
                    />
                </div>
            </div>

            {/* Phase indicators */}
            <div className="flex justify-between mt-3 px-1">
                {[1, 2, 3, 4, 5].map((p) => (
                    <div
                        key={p}
                        className="flex flex-col items-center gap-1"
                    >
                        <div
                            className="w-2 h-2 rounded-full transition-all duration-300"
                            style={{
                                background: p <= phase
                                    ? 'hsl(244 75% 62%)'
                                    : 'hsl(230 20% 85%)',
                                transform: p === phase ? 'scale(1.5)' : 'scale(1)'
                            }}
                        />
                        <span
                            className="text-[9px] font-medium uppercase tracking-wider transition-colors duration-300"
                            style={{
                                color: p <= phase ? 'hsl(244 70% 55%)' : 'hsl(230 15% 60%)'
                            }}
                        >
                            {p === 1 && 'Discovery'}
                            {p === 2 && 'Ingestion'}
                            {p === 3 && 'Graph'}
                            {p === 4 && 'LLM'}
                            {p === 5 && 'Plan'}
                        </span>
                    </div>
                ))}
            </div>

            {/* CSS for shimmer animation */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
