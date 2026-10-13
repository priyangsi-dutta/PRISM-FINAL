import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, FileSearch } from 'lucide-react';

const TRIAGE_STAGES = [
  { id: 1, label: 'Fetching Pull Request diff & metadata from GitHub API...', icon: FileSearch },
  { id: 2, label: 'Parsing AST, syntax tree, and sensitive security paths...', icon: Terminal },
  { id: 3, label: 'Evaluating security rules & calculating composite risk score...', icon: Cpu },
  { id: 4, label: 'Synthesizing evidence-backed findings & reviewer actions...', icon: Shield },
];

export default function LoadingSkeleton({ targetUrl = '' }) {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev < TRIAGE_STAGES.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Live Stage Progress Header */}
      <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-electric-500/10 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <span className="w-4 h-4 border-2 border-electric-400/30 border-t-electric-400 rounded-full animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                <span>AI Risk Triage in Progress</span>
                <span className="text-xs px-2 py-0.5 rounded bg-electric-500/10 text-electric-300 border border-electric-500/20 font-sans">
                  Active Run
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-md mt-0.5">
                {targetUrl || 'Analyzing pull request payload...'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-electric-400 bg-navy-900 px-3 py-1.5 rounded-lg border border-navy-750">
            Step {currentStage + 1} of {TRIAGE_STAGES.length}
          </span>
        </div>

        {/* Progress Pipeline */}
        <div className="space-y-2 pt-2 border-t border-navy-750">
          {TRIAGE_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < currentStage;
            const isCurrent = idx === currentStage;

            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 text-xs font-mono px-3 py-2 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-navy-900 border border-electric-500/40 text-electric-300'
                    : isCompleted
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  ) : isCurrent ? (
                    <span className="w-4 h-4 border-2 border-electric-400/40 border-t-electric-400 rounded-full animate-spin inline-block" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-navy-800 text-slate-600 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                </div>
                <span className={isCurrent ? 'font-medium' : ''}>{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pulsing Skeleton Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-navy-850/60 border border-navy-750/60 p-4 rounded-xl space-y-2 animate-pulse">
            <div className="h-3 bg-navy-750 rounded w-1/2" />
            <div className="h-7 bg-navy-700/60 rounded w-3/4" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-navy-850/60 border border-navy-750/60 p-4 rounded-xl space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-4 bg-navy-750 rounded w-16" />
              <div className="h-4 bg-navy-700/60 rounded w-1/3" />
            </div>
            <div className="h-3 bg-navy-750 rounded w-full" />
            <div className="h-3 bg-navy-750 rounded w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

