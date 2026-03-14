import React from 'react';
import { useAnalysisStore } from '../../store/analysisStore';
import { ProgressBar } from './ProgressBar';
import { StatCard } from './StatCard';
import { ActivityLog } from './ActivityLog';
import { PhaseTimeline } from './PhaseTimeline';

interface AnalysisDashboardProps {
    onEditConfig: () => void;
    onCancel: () => void;
}

export function AnalysisDashboard({ onEditConfig, onCancel }: AnalysisDashboardProps) {
    const {
        phase,
        progressMessage,
        filesProcessed,
        totalFiles,
        commitsFetched,
        llmCallsMade,
        llmCallsTotal,
        dependencyNodes,
        coChangePairs,
        activityLog
    } = useAnalysisStore();

    // Determine active states based on current phase
    const isPhase1 = phase === 1;
    const isPhase2 = phase === 2;
    const isPhase3 = phase === 3;
    const isPhase4 = phase === 4;
    const isPhase5 = phase === 5;

    return (
        <div className="min-h-screen" style={{ background: 'hsl(210 20% 98%)' }}>
            {/* Header */}
            <header className="border-b bg-white">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{ background: 'hsl(222 25% 15%)' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 18 22 12 16 6" />
                                <polyline points="8 6 2 12 8 18" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight" style={{ color: 'hsl(222 25% 15%)' }}>
                                Micromorph
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(215 15% 45%)' }}>
                                    Live Analysis Engine
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onEditConfig}
                            className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all hover:bg-slate-50 border shadow-sm"
                            style={{ background: 'white', color: 'hsl(222 25% 15%)', borderColor: 'hsl(214 20% 90%)' }}
                        >
                            Edit Config
                        </button>
                        <button
                            onClick={onCancel}
                            className="text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all hover:bg-red-50"
                            style={{ color: 'hsl(0 80% 60%)' }}
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

                {/* Current Operation Detail */}
                {(filesProcessed > 0 || llmCallsMade > 0) && (
                    <div
                        className="rounded-2xl p-5"
                        style={{ background: 'white', border: '1px solid hsl(230 20% 88%)' }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(222 25% 15%)' }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(215 15% 45%)' }}>
                                Current Operation
                            </span>
                        </div>

                        <div className="space-y-4">
                            {progressMessage && (
                                <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50/50" style={{ borderColor: 'hsl(214 20% 90%)' }}>
                                    <div
                                        className="w-2 h-2 rounded-full animate-ping"
                                        style={{ background: 'hsl(222 25% 15%)' }}
                                    />
                                    <span className="text-sm font-semibold tracking-tight" style={{ color: 'hsl(222 25% 15%)' }}>
                                        {progressMessage}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {totalFiles > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: 'hsl(230 30% 98%)', border: '1px solid hsl(230 20% 90%)' }}>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(230 15% 55%)' }}>Files</p>
                                        <p className="text-sm font-mono font-semibold" style={{ color: 'hsl(230 20% 25%)' }}>
                                            {filesProcessed.toLocaleString()} / {totalFiles.toLocaleString()}
                                        </p>
                                    </div>
                                )}

                                {commitsFetched > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: 'hsl(230 30% 98%)', border: '1px solid hsl(230 20% 90%)' }}>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(230 15% 55%)' }}>Commits</p>
                                        <p className="text-sm font-mono font-semibold" style={{ color: 'hsl(230 20% 25%)' }}>
                                            {commitsFetched.toLocaleString()}
                                        </p>
                                    </div>
                                )}

                                {llmCallsTotal > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: 'hsl(230 30% 98%)', border: '1px solid hsl(230 20% 90%)' }}>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(230 15% 55%)' }}>LLM Progress</p>
                                        <p className="text-sm font-mono font-semibold" style={{ color: 'hsl(230 20% 25%)' }}>
                                            {llmCallsMade} / {llmCallsTotal}
                                        </p>
                                    </div>
                                )}

                                {dependencyNodes > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: 'hsl(230 30% 98%)', border: '1px solid hsl(230 20% 90%)' }}>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'hsl(230 15% 55%)' }}>Graph</p>
                                        <p className="text-sm font-mono font-semibold" style={{ color: 'hsl(230 20% 25%)' }}>
                                            {dependencyNodes.toLocaleString()} nodes
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
