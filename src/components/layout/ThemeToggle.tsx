import React from 'react';
import { useAnalysisStore } from '../../store/analysisStore';

const themeOptions = [
  { id: 'light' as const, label: 'Light', icon: 'Sun' },
  { id: 'dark' as const, label: 'Dark', icon: 'Moon' }
];

function ThemeGlyph({ mode }: { mode: 'light' | 'dark' }) {
  if (mode === 'dark') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3c0 0 0 0 0 0A7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useAnalysisStore((state) => state.theme);
  const setTheme = useAnalysisStore((state) => state.setTheme);

  return (
    <div className="neo-toggle-track inline-flex items-center gap-1 rounded-full p-1.5">
      {themeOptions.map((option) => {
        const isActive = theme === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.24em] transition-all ${isActive ? 'neo-toggle-active text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            aria-pressed={isActive}
            aria-label={`Switch to ${option.label.toLowerCase()} mode`}
          >
            <ThemeGlyph mode={option.id} />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}