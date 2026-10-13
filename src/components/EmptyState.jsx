import React from 'react';
import { ShieldCheck, ArrowRight, Terminal } from 'lucide-react';

export default function EmptyState({ onAction, actionLabel = 'Analyze a Pull Request' }) {
  return (
    <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-electric-500/10 border border-electric-500/20 text-electric-400 mx-auto flex items-center justify-center">
        <ShieldCheck className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-white tracking-tight">
          No Active PR Triage Loaded
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Provide any GitHub pull request URL to execute automated AI risk assessment, evidence extraction, and security triage.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        {onAction && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="pt-4 border-t border-navy-750 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
        <Terminal className="w-3.5 h-3.5" />
        <span>Supports GitHub enterprise, public, and private repository endpoints</span>
      </div>
    </div>
  );
}

