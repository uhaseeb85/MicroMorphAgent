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
        <div className="neo-panel rounded-[2rem] p-6">
            <div className="flex items-center gap-2.5 mb-6">
                <div className="w-1.5 h-4 bg-foreground rounded-full" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
                    Analysis Pipeline
                </span>
            </div>

            <div className="space-y-1 relative">
                {phases.map((phase, index) => {
                    const isCompleted = currentPhase > phase.number;
                    const isActive = currentPhase === phase.number;
                    const isPending = currentPhase < phase.number;

                    return (
                        <div key={phase.number} className="relative">
                            <div
                                className="flex items-center gap-4 p-3 rounded-2xl transition-all duration-300"
                                style={{
                                    background: isActive ? 'var(--surface-subtle)' : 'transparent',
                                    border: isActive ? '1px solid hsl(var(--border) / 0.8)' : '1px solid transparent',
                                    boxShadow: isActive ? 'var(--shadow-ambient-soft)' : 'none'
                                }}
                            >
                                <div
                                    className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-sm"
                                    style={{
                                        background: isCompleted
                                            ? 'var(--surface-subtle)'
                                            : isActive
                                                ? 'var(--surface-strong)'
                                                : 'var(--surface-raised)',
                                        color: isCompleted
                                            ? 'hsl(var(--muted-foreground))'
                                            : isActive
                                                ? 'white'
                                                : 'hsl(var(--muted-foreground))',
                                        border: isCompleted || isActive ? 'none' : '1px solid hsl(var(--border))',
                                        boxShadow: isCompleted || isActive ? 'var(--shadow-button)' : 'var(--shadow-ambient-soft)'
                                    }}
                                >
                                    {isCompleted ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    ) : (
                                        <span className="text-[10px] font-bold">{phase.number}</span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold tracking-tight" style={{ color: isPending ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))' }}>
                                            {phase.title}
                                        </span>
                                        {isActive && (
                                            <span className="neo-button-primary text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-medium tracking-tight truncate" style={{ color: isPending ? 'hsl(var(--muted-foreground) / 0.8)' : 'hsl(var(--muted-foreground))' }}>
                                        {phase.description}
                                    </p>
                                </div>
                            </div>
                            
                            {index < phases.length - 1 && (
                                <div
                                    className="absolute left-[27px] w-[2px] h-4 z-0"
                                    style={{
                                        background: isCompleted ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                                        top: '40px'
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
