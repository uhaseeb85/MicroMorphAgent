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
        className="flex items-center gap-1.5 py-0.5 w-full text-left group"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-[11px] transition-transform" style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', color: 'hsl(244 60% 65%)' }}>▶</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(244 60% 65%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="text-sm font-semibold" style={{ color: 'hsl(230 20% 20%)' }}>{dirName}</span>
        <span className="text-[11px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'hsl(230 15% 55%)' }}>{description}</span>
      </button>
      {open && files.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 py-0.5 pl-5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(140 50% 50%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className="text-xs font-mono" style={{ color: 'hsl(230 15% 35%)' }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

export function ModuleStructureView({ structure }: { structure: ModuleStructure }) {
  const [activeTab, setActiveTab] = useState<'tree' | 'apis' | 'dockerfile'>('tree');

  const tabs = [
    { id: 'tree' as const, label: '📁 Module Tree' },
    { id: 'apis' as const, label: '🔌 APIs' },
    { id: 'dockerfile' as const, label: '🐳 Dockerfile' },
  ];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(230 20% 88%)', background: 'hsl(230 30% 99%)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'hsl(230 20% 90%)', background: 'hsl(230 25% 97%)' }}>
        <div>
          <span className="font-mono text-sm font-bold" style={{ color: 'hsl(244 70% 50%)' }}>{structure.rootArtifactId}</span>
          <span className="text-xs ml-2 font-mono" style={{ color: 'hsl(230 15% 55%)' }}>{structure.mavenGroupId}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'hsl(140 50% 92%)', color: 'hsl(140 50% 30%)' }}>Maven Module</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'hsl(230 20% 90%)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-xs font-semibold transition-colors"
            style={activeTab === tab.id ? {
              color: 'hsl(244 70% 55%)',
              borderBottom: '2px solid hsl(244 70% 55%)',
              marginBottom: '-1px'
            } : { color: 'hsl(230 15% 55%)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'tree' && (
          <div className="space-y-1">
            {/* Maven pom.xml */}
            <div className="flex items-center gap-1.5 py-0.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="hsl(30 80% 50%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(30 70% 40%)' }}>pom.xml</span>
            </div>
            {structure.directories.map((dir, i) => (
              <FileTreeEntry key={i} {...dir} />
            ))}
          </div>
        )}

        {activeTab === 'apis' && (
          <div className="space-y-4">
            {structure.exposedApis.length > 0 && (
              <div>
                <h5 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(230 15% 50%)' }}>Exposes</h5>
                <div className="space-y-1.5">
                  {structure.exposedApis.map((api, i) => {
                    const [method, ...rest] = api.split(' ');
                    const path = rest.join(' ');
                    const color = method === 'GET' ? 'hsl(140 60% 40%)' : method === 'POST' ? 'hsl(200 70% 45%)' : method === 'PUT' ? 'hsl(40 80% 45%)' : method === 'DELETE' ? 'hsl(0 70% 50%)' : 'hsl(270 60% 50%)';
                    const bg = method === 'GET' ? 'hsl(140 60% 95%)' : method === 'POST' ? 'hsl(200 70% 95%)' : method === 'PUT' ? 'hsl(40 80% 95%)' : method === 'DELETE' ? 'hsl(0 70% 96%)' : 'hsl(270 60% 96%)';
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono">
                        <span className="font-bold px-1.5 py-0.5 rounded text-[10px] min-w-[42px] text-center" style={{ color, background: bg }}>{method}</span>
                        <span style={{ color: 'hsl(230 15% 30%)' }}>{path}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {structure.consumedApis.length > 0 && (
              <div>
                <h5 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(230 15% 50%)' }}>Consumes</h5>
                <div className="space-y-1.5">
                  {structure.consumedApis.map((api, i) => (
                    <div key={i} className="text-xs font-mono" style={{ color: 'hsl(230 15% 45%)' }}>→ {api}</div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'hsl(230 15% 50%)' }}>DB Schema</h5>
              <p className="text-xs" style={{ color: 'hsl(230 15% 40%)' }}>{structure.databaseSchema}</p>
            </div>
          </div>
        )}

        {activeTab === 'dockerfile' && (
          <pre className="text-xs rounded-lg p-3 overflow-x-auto leading-relaxed font-mono"
               style={{ background: 'hsl(230 25% 12%)', color: 'hsl(140 60% 70%)' }}>
            {structure.dockerfileSuggestion}
          </pre>
        )}
      </div>
    </div>
  );
}
