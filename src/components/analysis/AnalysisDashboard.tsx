import React from 'react';
import { useAnalysisStore } from '../../store/analysisStore';
import { ProgressBar } from './ProgressBar';
import { StatCard } from './StatCard';
import { ActivityLog } from './ActivityLog';
import { PhaseTimeline } from './PhaseTimeline';
import { ThemeToggle } from '../layout/ThemeToggle';

interface AnalysisDashboardProps {
    onEditConfig: () => void;
    onCancel: () => void;
    resultsReady?: boolean;
    onViewResults?: () => void;
    onHome?: () => void;
}

export function AnalysisDashboard({ onEditConfig, onCancel, resultsReady = false, onViewResults, onHome }: AnalysisDashboardProps) {
    const phase = useAnalysisStore((state) => state.phase);
    const progressMessage = useAnalysisStore((state) => state.progressMessage);
    const filesProcessed = useAnalysisStore((state) => state.filesProcessed);
    const totalFiles = useAnalysisStore((state) => state.totalFiles);
    const commitsFetched = useAnalysisStore((state) => state.commitsFetched);
    const llmCallsMade = useAnalysisStore((state) => state.llmCallsMade);
    const llmCallsTotal = useAnalysisStore((state) => state.llmCallsTotal);
    const dependencyNodes = useAnalysisStore((state) => state.dependencyNodes);
    const coChangePairs = useAnalysisStore((state) => state.coChangePairs);
    const activityLog = useAnalysisStore((state) => state.activityLog);

    // Determine active states based on current phase
    const isPhase2 = phase === 2;
    const isPhase3 = phase === 3;
    const isPhase4 = phase === 4;
    const isPhase5 = phase === 5;

    return (
        <div className="neo-shell min-h-screen text-foreground">
            {/* Header */}
            <header className="border-b neo-divider bg-transparent">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={onHome}
                        disabled={!onHome}
                        className={`flex items-center gap-4 transition-opacity ${onHome ? 'hover:opacity-75 cursor-pointer' : 'cursor-default'}`}
                    >
                        <div className="neo-button-primary w-10 h-10 rounded-2xl flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground">
                                Micromorph
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${resultsReady ? 'bg-sky-500' : 'bg-emerald-500 animate-pulse'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {resultsReady ? 'Awaiting Review Confirmation' : 'Live Analysis Engine'}
                                </span>
                            </div>
                        </div>
                    </button>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button
                            onClick={onEditConfig}
                            className="neo-button text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-2xl transition-all text-foreground"
                        >
                            Edit Config
                        </button>
                        <button
                            onClick={onCancel}
                            className="neo-button text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-2xl transition-all text-rose-500 dark:text-rose-300"
                        >
                            Stop
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto p-6 space-y-8">
                {/* Progress Bar Section */}
                <ProgressBar phase={phase} progressMessage={progressMessage} />

                {resultsReady && (
                    <div className="neo-panel rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                                Analysis Complete
                            </p>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                Results are ready for review.
                            </h2>
                            <p className="text-sm text-muted-foreground max-w-2xl">
                                The analysis has finished successfully. Review the final activity log and open the report when you are ready.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={onEditConfig}
                                className="neo-button px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                            >
                                Adjust Configuration
                            </button>
                            <button
                                type="button"
                                onClick={onViewResults}
                                className="neo-button-primary px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest"
                            >
                                View Results
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={(
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        )}
                        label="Files Processed"
                        value={filesProcessed}
                        total={totalFiles > 0 ? totalFiles : undefined}
                        color="blue"
                        isActive={isPhase2}
                        pulseText={isPhase2 ? 'Parsing...' : undefined}
                    />

                    <StatCard
                        icon={(
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="4" />
                                <line x1="1.05" y1="12" x2="7" y2="12" />
                                <line x1="17.01" y1="12" x2="22.96" y2="12" />
                            </svg>
                        )}
                        label="Git Commits"
                        value={commitsFetched}
                        color="orange"
                        isActive={isPhase3}
                        pulseText={isPhase3 ? 'Analyzing...' : undefined}
                    />

                    <StatCard
                        icon={(
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" />
                                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                            </svg>
                        )}
                        label="LLM Calls"
                        value={llmCallsMade}
                        total={llmCallsTotal > 0 ? llmCallsTotal : undefined}
                        color="purple"
                        isActive={isPhase4 || isPhase5}
                        pulseText={isPhase4 || isPhase5 ? 'Thinking...' : undefined}
                    />

                    <StatCard
                        icon={(
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                        )}
                        label="Graph Nodes"
                        value={dependencyNodes}
                        suffix={coChangePairs > 0 ? `+${coChangePairs} pairs` : undefined}
                        color="green"
                        isActive={isPhase3}
                        pulseText={isPhase3 ? 'Building...' : undefined}
                    />
                </div>

                {/* Bottom Section: Activity Log + Phase Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Log - takes up 2 columns */}
                    <div className="lg:col-span-2">
                        <ActivityLog activities={activityLog} />
                    </div>

                    {/* Phase Timeline */}
                    <div className="lg:col-span-1">
                        <PhaseTimeline currentPhase={phase} />
                    </div>
                </div>
            </main>
        </div>
    );
}
