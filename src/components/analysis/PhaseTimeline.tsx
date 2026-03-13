import React from 'react';

interface PhaseTimelineProps {
    currentPhase: number;
}

const phases = [
    {
        number: 1,
        title: 'Repository Discovery',
        description: 'POM analysis & structure',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                <path d="M14 2v6h6" />
                <path d="M2 15h10" />
                <path d="M5 12v6" />
                <path d="M8 12v6" />
                <path d="M11 12v6" />
            </svg>
        )
    },
    {
        number: 2,
        title: 'Code Ingestion',
        description: 'Parse Java source files',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        )
    },
    {
        number: 3,
        title: 'Graph Construction',
        description: 'Dependencies & co-changes',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
        )
    },
    {
        number: 4,
        title: 'LLM Analysis',
        description: 'Semantic summarization',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" />
                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
        )
    },
    {
        number: 5,
        title: 'Decomposition',
        description: 'Generate final plan',
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
        )
    }
];

export function PhaseTimeline({ currentPhase }: PhaseTimelineProps) {
    return (
        <div
            className="rounded-2xl p-5"
            style={{ background: 'white', border: '1px solid hsl(230 20% 88%)' }}
        >
            <div className="flex items-center gap-2 mb-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(244 70% 55%)' }}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(230 15% 45%)' }}>
                    Analysis Pipeline
                </span>
            </div>

            <div className="space-y-1">
                {phases.map((phase, index) => {
                    const isCompleted = currentPhase > phase.number;
                    const isActive = currentPhase === phase.number;
                    const isPending = currentPhase < phase.number;

                    return (
                        <div
                            key={phase.number}
                            className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300"
                            style={{
                                background: isActive ? 'hsl(244 80% 97%)' : 'transparent',
                                border: isActive ? '1px solid hsl(244 70% 88%)' : '1px solid transparent'
                            }}
                        >
                            {/* Status indicator */}
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
                                style={{
                                    background: isCompleted
                                        ? 'hsl(140 55% 93%)'
                                        : isActive
                                            ? 'linear-gradient(135deg, hsl(244 75% 62%), hsl(220 75% 68%))'
                                            : 'hsl(230 20% 95%)',
                                    color: isCompleted
                                        ? 'hsl(140 55% 35%)'
                                        : isActive
                                            ? 'white'
                                            : 'hsl(230 15% 60%)'
                                }}
                            >
                                {isCompleted ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : isActive ? (
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold">{phase.number}</span>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-sm font-semibold"
                                        style={{
                                            color: isPending ? 'hsl(230 15% 60%)' : 'hsl(230 20% 25%)'
                                        }}
                                    >
                                        {phase.title}
                                    </span>
                                    {isActive && (
                                        <span
                                            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                            style={{ background: 'hsl(244 80% 93%)', color: 'hsl(244 70% 50%)' }}
                                        >
                                            Active
                                        </span>
                                    )}
                                </div>
                                <p
                                    className="text-xs truncate"
                                    style={{ color: isPending ? 'hsl(230 15% 55%)' : 'hsl(230 15% 50%)' }}
                                >
                                    {phase.description}
                                </p>
                            </div>

                            {/* Connector line (except for last item) */}
                            {index < phases.length - 1 && (
                                <div
                                    className="absolute left-[27px] w-0.5 h-6"
                                    style={{
                                        background: isCompleted ? 'hsl(140 55% 70%)' : 'hsl(230 20% 90%)',
                                        transform: 'translateY(28px)'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
