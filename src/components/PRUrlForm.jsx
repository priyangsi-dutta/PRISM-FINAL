import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, X, AlertCircle, CheckCircle2, Sparkles, Terminal, Copy } from 'lucide-react';
import { parseGitHubUrl } from '../services/api';
import { DEMO_PRS } from '../services/demoFixtures';

export default function PRUrlForm({
  onSubmit,
  onSelectDemoFixture,
  isLoading = false,
  initialUrl = '',
  isDemoMode = false,
}) {
  const [url, setUrl] = useState(initialUrl);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  const parsed = parseGitHubUrl(url);
  const isFormatValid = parsed !== null;
  const showError = touched && url.trim().length > 0 && !isFormatValid;

  const handleSubmit = (e) => {
    e?.preventDefault();
    setTouched(true);
    if (!url.trim()) return;
    if (isFormatValid) {
      onSubmit(url.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading && isFormatValid) {
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setUrl('');
      setTouched(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setTouched(true);
      }
    } catch {
      // Clipboard access blocked or not supported
    }
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Input field container */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>

            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTouched(true);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="https://github.com/owner/repository/pull/123"
              className={`w-full pl-10 pr-24 py-3 bg-navy-900 border rounded-xl font-mono text-sm text-slate-100 placeholder-slate-500 transition-all focus:outline-none ${
                showError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/50'
                  : isFormatValid
                  ? 'border-electric-500/50 focus:border-electric-400 focus:ring-1 focus:ring-electric-400/40'
                  : 'border-navy-750 focus:border-electric-500/60 focus:ring-1 focus:ring-electric-500/30'
              } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            />

            {/* Quick Actions inside input */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              {url ? (
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setTouched(false);
                  }}
                  disabled={isLoading}
                  className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-navy-800 transition"
                  title="Clear input (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  disabled={isLoading}
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 bg-navy-800/80 hover:bg-navy-750 border border-navy-700/60 px-2 py-1 rounded transition"
                  title="Paste from clipboard"
                >
                  <Copy className="w-3 h-3" />
                  <span>Paste</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !url.trim() || !isFormatValid}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 select-none shadow-sm ${
              isLoading || !url.trim() || !isFormatValid
                ? 'bg-navy-800 text-slate-500 border border-navy-750 cursor-not-allowed'
                : 'bg-electric-600 hover:bg-electric-500 text-white shadow-electric-600/20 hover:shadow-lg active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Triaging PR...</span>
              </>
            ) : (
              <>
                <span>Run Triage</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Validation and Metadata Feedback */}
        <div className="min-h-[24px] mt-2 px-1 flex flex-wrap items-center justify-between text-xs">
          {showError ? (
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Enter a valid pull request link (e.g., https://github.com/org/repo/pull/42)</span>
            </div>
          ) : isFormatValid ? (
            <div className="flex items-center gap-2 text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Target: <span className="font-semibold text-white">{parsed.fullRepo}</span> (PR #{parsed.prNumber})
              </span>
            </div>
          ) : (
            <span className="text-slate-500 font-mono text-[11px]">
              Submits to POST /api/analyze with payload: {'{ url }'}
            </span>
          )}

          <span className="text-slate-500 font-mono text-[11px] ml-auto hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-navy-900 border border-navy-750 text-slate-400">Enter</kbd> to analyze
          </span>
        </div>
      </form>

      {/* Demo Fixtures Selector */}
      <div className="pt-2 border-t border-navy-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-electric-400" />
            <span className="uppercase tracking-wider font-semibold">Demo Fixtures & Test Vectors</span>
            <span className="text-[10px] bg-electric-500/10 text-electric-400 border border-electric-500/20 px-1.5 py-0.2 rounded font-sans">
              Instant Preview
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any fixture to load simulated triage report
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DEMO_PRS.map((fixture) => {
            const badgeClasses = {
              critical: 'bg-red-500/10 text-red-400 border-red-500/30',
              high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
              low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            }[fixture.badgeColor] || 'bg-navy-750 text-slate-400';

            return (
              <button
                key={fixture.id}
                type="button"
                onClick={() => {
                  setUrl(fixture.url);
                  setTouched(true);
                  if (onSelectDemoFixture) {
                    onSelectDemoFixture(fixture);
                  }
                }}
                disabled={isLoading}
                className="text-left p-3 rounded-lg bg-navy-900/80 hover:bg-navy-800/90 border border-navy-750/70 hover:border-electric-500/40 transition group flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badgeClasses}`}>
                    {fixture.badgeText}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-300 transition">
                    [DEMO FIXTURE]
                  </span>
                </div>
                <div className="text-xs text-slate-200 font-medium line-clamp-1 group-hover:text-electric-300 transition">
                  {fixture.label}
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  {fixture.data.repository}#{fixture.data.pr_number}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

