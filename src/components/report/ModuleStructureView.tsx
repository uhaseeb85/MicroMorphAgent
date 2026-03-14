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
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-400 transition-colors" />
        <span className="text-sm font-bold tracking-tight text-slate-800">{dirName}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest ml-3 opacity-0 group-hover:opacity-100 transition-all text-slate-400">
            {description}
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1 pl-6">
              <div className="w-[1px] h-4 bg-slate-100" />
              <div className="w-1.5 h-1.5 border border-slate-200 rounded-sm" />
              <span className="text-[11px] font-mono font-medium text-slate-500">{f}</span>
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
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: 'hsl(214 20% 90%)' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50/50" style={{ borderColor: 'hsl(214 20% 92%)' }}>
        <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                <span className="font-bold text-xs">M</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Maven Project</div>
              <div className="text-sm font-bold text-slate-900 tracking-tight mt-1">{structure.rootArtifactId}</div>
            </div>
        </div>
        <div className="text-right">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Group Definition</div>
            <div className="text-[11px] font-mono font-bold text-slate-500">{structure.mavenGroupId}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 bg-white border-b" style={{ borderColor: 'hsl(214 20% 92%)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all relative"
            style={{ color: activeTab === tab.id ? 'hsl(222 25% 15%)' : 'hsl(215 15% 55%)' }}>
            {tab.label}
            {activeTab === tab.id && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-slate-900 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'tree' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 py-1 mb-2">
              <div className="w-3 h-3 bg-slate-900 rounded-sm" />
              <span className="text-[11px] font-mono font-bold text-slate-900">pom.xml</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 ml-auto">Build Manifest</span>
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
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
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
                        <span className="text-slate-700 tracking-tight">{path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {structure.consumedApis.length > 0 && (
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Upstream Dependencies
                </h5>
                <div className="space-y-2">
                  {structure.consumedApis.map((api, i) => (
                    <div key={i} className="text-[11px] font-mono font-bold text-slate-500 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        {api}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
               <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                    <div className="w-1 h-3 bg-slate-300 rounded-full" />
                    Projected Persistence Schema
                </h5>
              <div className="p-3 rounded-xl border bg-slate-50/50 border-slate-200">
                <p className="text-xs font-mono font-bold text-slate-600">{structure.databaseSchema}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dockerfile' && (
          <div className="rounded-2xl overflow-hidden shadow-inner border border-slate-800">
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
