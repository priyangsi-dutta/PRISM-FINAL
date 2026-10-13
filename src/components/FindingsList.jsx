import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight, 
  FileCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Search,
  Filter,
  Lightbulb,
  AlertOctagon
} from 'lucide-react';
import SeverityBadge from './SeverityBadge';

export default function FindingsList({ findings = [], repository = '' }) {
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => {
    // By default expand critical and high findings
    const initial = {};
    findings.forEach((f) => {
      if (f.severity === 'CRITICAL' || f.severity === 'HIGH') {
        initial[f.id] = true;
      }
    });
    return initial;
  });
  const [copiedId, setCopiedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySnippet = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const counts = useMemo(() => {
    const c = { ALL: findings.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    findings.forEach((f) => {
      const sev = f.severity || 'MEDIUM';
      if (c[sev] !== undefined) c[sev]++;
    });
    return c;
  }, [findings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchesSev = selectedSeverity === 'ALL' || f.severity === selectedSeverity;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.title?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.filePath?.toLowerCase().includes(q) ||
        f.cwe?.toLowerCase().includes(q);
      return matchesSev && matchesSearch;
    });
  }, [findings, selectedSeverity, searchQuery]);

  if (!findings || findings.length === 0) {
    return (
      <div className="bg-navy-900 border border-navy-750 rounded-xl p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <Check className="w-5 h-5" />
        </div>
        <h4 className="text-base font-semibold text-slate-200">No Security Findings Detected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Static analysis, rule heuristics, and LLM reasoning found zero vulnerabilities in this pull request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-navy-900/60 border border-navy-750 p-2.5 rounded-xl">
        {/* Severity Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
            const count = counts[sev] || 0;
            const isActive = selectedSeverity === sev;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-electric-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
                }`}
              >
                <span>{sev}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-navy-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter findings by file, rule, CWE..."
            className="w-full pl-9 pr-3 py-1.5 bg-navy-950 border border-navy-750 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-electric-500/60 font-mono"
          />
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.map((finding) => {
          const isExpanded = Boolean(expandedIds[finding.id]);
          const isCopied = copiedId === finding.id;

          return (
            <div
              key={finding.id}
              className={`border rounded-xl transition-all duration-200 bg-navy-850/90 overflow-hidden ${
                finding.severity === 'CRITICAL'
                  ? 'border-red-500/40 hover:border-red-500/60'
                  : finding.severity === 'HIGH'
                  ? 'border-orange-500/30 hover:border-orange-500/50'
                  : 'border-navy-750 hover:border-navy-650'
              }`}
            >
              {/* Finding Header */}
              <div
                onClick={() => toggleExpand(finding.id)}
                className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none hover:bg-navy-800/40 transition"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 flex-shrink-0 text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-electric-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={finding.severity} size="sm" />
                      <h4 className="text-sm font-semibold text-slate-100 break-words">
                        {finding.title}
                      </h4>
                      {finding.cwe && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700/60">
                          {finding.cwe}
                        </span>
                      )}
                    </div>

                    {/* File location */}
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <FileCode className="w-3.5 h-3.5 text-electric-400 flex-shrink-0" />
                      <span className="text-slate-300 font-medium truncate">
                        {finding.filePath}
                      </span>
                      {finding.lineNumber && (
                        <span className="text-electric-400">
                          :L{finding.lineNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(finding.id);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 font-mono px-2 py-1 rounded hover:bg-navy-800 transition"
                >
                  {isExpanded ? 'Collapse' : 'Inspect'}
                </button>
              </div>

              {/* Finding Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-navy-800/80 space-y-3.5 bg-navy-900/40">
                  {/* Detailed Description */}
                  {finding.description && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                        Impact & Vulnerability Details
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>
                  )}

                  {/* Evidence / Code Snippet */}
                  {finding.evidence && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5 text-electric-400">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          Evidence Code Diff
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySnippet(finding.id, finding.evidence)}
                          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition bg-navy-800 px-2 py-0.5 rounded border border-navy-700/60"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy snippet</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="rounded-lg bg-navy-950 border border-navy-800 p-3 overflow-x-auto">
                        <pre className="font-mono text-xs text-slate-300 leading-5">
                          {finding.evidence.split('\n').map((line, lIdx) => {
                            let lineClass = 'text-slate-400';
                            if (line.startsWith('+')) lineClass = 'text-emerald-400 bg-emerald-500/10 -mx-3 px-3 block';
                            else if (line.startsWith('-')) lineClass = 'text-red-400 bg-red-500/10 -mx-3 px-3 block';
                            else if (line.startsWith('@')) lineClass = 'text-electric-400 bg-electric-500/5 -mx-3 px-3 block';

                            return (
                              <div key={lIdx} className={lineClass}>
                                {line}
                              </div>
                            );
                          })}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Remediation / Recommendation */}
                  {finding.recommendation && (
                    <div className="p-3 rounded-lg bg-navy-900 border border-navy-750 flex items-start gap-2.5">
                      <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <span className="font-mono font-semibold text-amber-300 block">
                          Suggested Remediation
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {finding.recommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredFindings.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400 bg-navy-900/40 rounded-xl border border-navy-800">
            No findings match your current filters.
          </div>
        )}
      </div>
    </div>
  );
}

