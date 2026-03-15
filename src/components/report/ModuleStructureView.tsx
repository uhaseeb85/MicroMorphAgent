import React, { useState } from 'react';
import type { ModuleStructure } from '../../types';

function FileTreeEntry({ path, description, files }: { path: string; description: string; files: string[] }) {
  const [open, setOpen] = useState(true);
  const parts = path.split('/');
  const dirName = parts[parts.length - 1];
  const indent = Math.max(0, parts.length - 3) * 16;

  return (
    <div style={{ marginLeft: indent }}>
      <button
        className="flex items-center gap-2 py-1 w-full text-left group"
        onClick={() => setOpen(v => !v)}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-foreground/50 transition-colors" />
        <span className="text-sm font-bold tracking-tight text-foreground">{dirName}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest ml-3 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground">
            {description}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1 pl-6">
              <div className="w-[1px] h-4 bg-border" />
              <div className="w-1.5 h-1.5 border border-border rounded-sm" />
              <span className="text-[11px] font-mono font-medium text-muted-foreground">{f}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function ModuleStructureView({ structure }: { structure: ModuleStructure }) {
  const [activeTab, setActiveTab] = useState<'tree' | 'apis' | 'dockerfile'>('tree');

  const tabs = [
    { id: 'tree' as const, label: 'FILES' },
    { id: 'apis' as const, label: 'ENDPOINTS' },
    { id: 'dockerfile' as const, label: 'RUNTIME' },
  ];

  return (
    <div className="neo-panel rounded-[2rem] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b neo-divider flex items-center justify-between bg-transparent">
        <div className="flex items-center gap-4">
            <div className="neo-button-primary w-8 h-8 rounded-xl flex items-center justify-center">
                <span className="font-bold text-xs">M</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Maven Project</div>
              <div className="text-sm font-bold text-foreground tracking-tight mt-1">{structure.rootArtifactId}</div>
            </div>
        </div>
        <div className="text-right">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Group Definition</div>
            <div className="text-[11px] font-mono font-bold text-muted-foreground">{structure.mavenGroupId}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 bg-transparent border-b neo-divider">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative rounded-full ${activeTab === tab.id ? 'neo-toggle-active text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'tree' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 py-1 mb-2">
              <div className="w-3 h-3 bg-foreground rounded-sm" />
              <span className="text-[11px] font-mono font-bold text-foreground">pom.xml</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-auto">Build Manifest</span>
            </div>
            {structure.directories.map((dir, i) => (
              <FileTreeEntry key={i} {...dir} />
            ))}
          </div>
        )}

        {activeTab === 'apis' && (
          <div className="space-y-8">
            {structure.exposedApis.length > 0 && (
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    REST Interface Definitions
                </h5>
                <div className="space-y-2">
                  {structure.exposedApis.map((api, i) => {
                    const [method, ...rest] = api.split(' ');
                    const path = rest.join(' ');
                    const color = method === 'GET' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 
                                  method === 'POST' ? 'text-blue-600 bg-blue-50 border-blue-100' : 
                                  method === 'PUT' ? 'text-amber-600 bg-amber-50 border-amber-100' : 
                                  method === 'DELETE' ? 'text-rose-600 bg-rose-50 border-rose-100' : 
                                  'text-slate-600 bg-slate-50 border-slate-100';
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded border text-[9px] min-w-[50px] text-center shadow-sm ${color}`}>{method}</span>
                        <span className="text-foreground/85 tracking-tight">{path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {structure.consumedApis.length > 0 && (
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Upstream Dependencies
                </h5>
                <div className="space-y-2">
                  {structure.consumedApis.map((api, i) => (
                    <div key={i} className="text-[11px] font-mono font-bold text-muted-foreground flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-border" />
                        {api}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
               <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-1 h-3 bg-border rounded-full" />
                    Projected Persistence Schema
                </h5>
              <div className="neo-inset p-3 rounded-2xl">
                <p className="text-xs font-mono font-bold text-foreground/80">{structure.databaseSchema}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dockerfile' && (
          <div className="rounded-[1.5rem] overflow-hidden shadow-inner border border-slate-800/70">
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dockerfile</span>
              </div>
              <pre className="text-[11px] p-6 overflow-x-auto leading-relaxed font-mono bg-slate-900 text-slate-400">
                {structure.dockerfileSuggestion}
              </pre>
          </div>
        )}
      </div>
    </div>
  );
}
