import React from 'react';

interface ProgressBarProps {
    phase: number;
    progressMessage: string;
}

export function ProgressBar({ phase, progressMessage }: ProgressBarProps) {
    const totalPhases = 5;
    const phaseProgress = Math.max(0, Math.min(phase, totalPhases));
    const percentage = (phaseProgress / totalPhases) * 100;

    return (
        <div
            className="rounded-2xl p-8 border shadow-sm bg-white"
            style={{ borderColor: 'hsl(214 20% 90%)' }}
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <div
                            className="absolute inset-0 rounded-xl bg-slate-100 animate-pulse"
                        />
                        <div
                            className="relative w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                            style={{ background: 'hsl(222 25% 15%)' }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">
                            Analyzing Architecture
                        </h2>
                        <p className="text-sm font-medium text-slate-500">
                            {progressMessage || 'Initializing analysis engine...'}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <span className="text-3xl font-bold tracking-tighter text-slate-900">
                        {Math.round(percentage)}%
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Phase {phase} / {totalPhases}
                    </p>
                </div>
            </div>

            <div
                className="w-full h-2 rounded-full overflow-hidden bg-slate-100"
            >
                <div
                    className="h-full rounded-full transition-all duration-1000 ease-in-out relative overflow-hidden"
                    style={{
                        width: `${Math.max(5, percentage)}%`,
                        background: 'hsl(222 25% 15%)'
                    }}
                >
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                            animation: 'shimmer 2s infinite'
                        }}
                    />
                </div>
            </div>

            <div className="flex justify-between mt-5 px-1">
                {[1, 2, 3, 4, 5].map((p) => (
                    <div
                        key={p}
                        className="flex flex-col items-center gap-2"
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full transition-all duration-500"
                            style={{
                                background: p <= phase
                                    ? 'hsl(222 25% 15%)'
                                    : 'hsl(214 20% 90%)',
                                transform: p === phase ? 'scale(1.2)' : 'scale(1)',
                                boxShadow: p === phase ? '0 0 0 4px hsl(222 25% 15% / 10%)' : 'none'
                            }}
                        />
                        <span
                            className="text-[9px] font-bold uppercase tracking-widest transition-colors duration-500"
                            style={{
                                color: p <= phase ? 'hsl(222 25% 15%)' : 'hsl(215 15% 45%)'
                            }}
                        >
                            {p === 1 && 'Discovery'}
                            {p === 2 && 'Ingestion'}
                            {p === 3 && 'Graph'}
                            {p === 4 && 'Semantic'}
                            {p === 5 && 'Blueprint'}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
