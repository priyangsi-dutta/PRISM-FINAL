import React from 'react';
import { 
  LayoutDashboard, 
  GitPullRequest, 
  FileText, 
  Settings, 
  ShieldAlert, 
  Terminal, 
  Cpu, 
  ExternalLink,
  HelpCircle,
  X
} from 'lucide-react';

export default function Sidebar({
  activeView = 'dashboard',
  onSelectView,
  hasAnalysis = false,
  isOpen = false,
  onClose,
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'analyze',
      label: 'Analyze Pull Request',
      icon: GitPullRequest,
      badge: 'POST',
    },
    {
      id: 'report',
      label: 'Analysis Report',
      icon: FileText,
      badge: hasAnalysis ? 'Active' : null,
      disabled: !hasAnalysis,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-navy-900 border-r border-navy-750 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Logo & Nav items */}
        <div className="p-4 space-y-6">
          {/* Brand header */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-electric-600/20 border border-electric-500/40 flex items-center justify-center text-electric-400">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-base tracking-tight text-white font-mono flex items-center gap-1">
                  PRism
                  <span className="w-1.5 h-1.5 rounded-full bg-electric-400 inline-block" />
                </span>
                <span className="text-[10px] font-mono text-slate-500 block -mt-0.5">
                  PR Risk Triage Platform
                </span>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Platform Views
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isDisabled = item.disabled;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) {
                      onSelectView(item.id);
                      if (onClose) onClose();
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                    isActive
                      ? 'bg-electric-600/20 text-electric-300 border border-electric-500/40 font-semibold shadow-sm'
                      : isDisabled
                      ? 'text-slate-600 cursor-not-allowed opacity-50'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-navy-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-electric-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? 'bg-electric-500/30 text-electric-200'
                          : 'bg-navy-800 text-slate-400 border border-navy-700/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Engine Specs Card */}
        <div className="p-4 space-y-3">
          <div className="bg-navy-850 border border-navy-750/80 rounded-xl p-3.5 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-electric-400" />
                <span>Engine Target</span>
              </span>
              <span className="text-[10px] text-slate-400 bg-navy-900 px-1.5 py-0.2 rounded border border-navy-750">
                POST /api/analyze
              </span>
            </div>

            <div className="pt-1.5 border-t border-navy-750 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Classification</span>
              <span className="text-slate-300 font-medium">Risk & CVE Triage</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Security Rules</span>
              <span className="text-emerald-400 font-medium">Active (v1.0)</span>
            </div>
          </div>

          <div className="px-2 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>PRism Hackathon 2026</span>
            <span className="text-electric-400">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

