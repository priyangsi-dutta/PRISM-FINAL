import React from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Github, 
  Menu, 
  X, 
  Activity, 
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';

export default function Header({
  activeView = 'dashboard',
  isDemoMode = false,
  onToggleDemoMode,
  backendConnected = false,
  onToggleMobileMenu,
  mobileMenuOpen = false,
}) {
  const viewTitles = {
    dashboard: 'Triage Overview & Metrics',
    analyze: 'Analyze Pull Request',
    report: 'Pull Request Triage Report',
    history: 'Triage History',
    settings: 'Engine Settings & API',
  };

  return (
    <header className="sticky top-0 z-30 bg-navy-900/90 backdrop-blur-md border-b border-navy-750/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & View title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-navy-800 text-slate-300 hover:text-white border border-navy-700/60"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {viewTitles[activeView] || 'PRism'}
            </h2>
            {isDemoMode && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-300 border border-electric-500/30">
                Demo Mode
              </span>
            )}
          </div>
          <span className="hidden sm:block text-[11px] font-mono text-slate-500">
            Autonomous GitHub PR risk classification & security triage
          </span>
        </div>
      </div>

      {/* Right: Status badge, Demo toggle, and GitHub link */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Backend Connectivity Status */}
        <div
          className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
            backendConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-navy-850 border-navy-750 text-slate-400'
          }`}
          title={
            backendConnected
              ? 'Connected to local backend'
              : 'Backend server not detected (POST /api/analyze)'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="text-[11px]">
            {backendConnected ? 'API Online' : 'API Standby'}
          </span>
        </div>

        {/* Demo Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDemoMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition ${
            isDemoMode
              ? 'bg-electric-600/20 border-electric-400/50 text-electric-300'
              : 'bg-navy-850 hover:bg-navy-800 border-navy-750 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Demo Fixtures Mode"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Demo Mode:</span>
          <span className={`font-semibold ${isDemoMode ? 'text-electric-300' : 'text-slate-500'}`}>
            {isDemoMode ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* GitHub link */}
        <a
          href="https://github.com/ghoshsoumya-ops/PRISM"
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-xl bg-navy-850 hover:bg-navy-800 border border-navy-750 text-slate-400 hover:text-white transition"
          title="PRism Repository"
        >
          <Github className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}

