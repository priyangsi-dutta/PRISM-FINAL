import React from 'react';
import { AlertOctagon, RefreshCw, Terminal, ArrowRight, HelpCircle } from 'lucide-react';

export default function ErrorState({ 
  error, 
  onRetry, 
  onUseDemo, 
  targetUrl = '' 
}) {
  const errorMessage = error?.message || 'An unexpected error occurred during pull request analysis.';
  const isNetwork = Boolean(error?.isNetworkError);
  const status = error?.status;

  return (
    <div className="bg-navy-850 border border-red-500/30 rounded-2xl p-6 sm:p-8 space-y-5 max-w-2xl mx-auto my-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertOctagon className="w-5 h-5" />
        </div>

        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Triage Request Failed
            </h3>
            {status && (
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                HTTP {status}
              </span>
            )}
          </div>
          <p className="text-xs text-red-300 font-mono leading-relaxed break-words">
            {errorMessage}
          </p>
        </div>
      </div>

      {isNetwork && (
        <div className="bg-navy-900 border border-navy-750 p-4 rounded-xl space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-mono font-semibold text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Developer Troubleshooting</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
            <li>Ensure your backend server is running and listening on port 8000 (or configure <code className="text-slate-300">VITE_API_BASE_URL</code> in <code className="text-slate-300">.env</code>).</li>
            <li>Verify the backend endpoint <code className="text-slate-300">POST /api/analyze</code> accepts <code className="text-slate-300">{'{ url }'}</code>.</li>
            <li>Alternatively, test the frontend immediately with our pre-built demo fixtures.</li>
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-200 text-xs font-mono transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Retry Request</span>
          </button>
        )}

        {onUseDemo && (
          <button
            type="button"
            onClick={onUseDemo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-semibold transition"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Load Demo PR (Offline Mode)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

