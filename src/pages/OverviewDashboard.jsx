import React from 'react';
import { 
  GitPullRequest, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Terminal, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertOctagon,
  FileCode
} from 'lucide-react';
import SummaryCard from '../components/SummaryCard';
import SeverityBadge from '../components/SeverityBadge';
import RiskDistributionBar from '../components/RiskDistributionBar';
import { DEMO_OVERVIEW_METRICS, DEMO_PRS } from '../services/demoFixtures';

export default function OverviewDashboard({
  onNavigateToAnalyze,
  onSelectFixture,
  onSelectRecentActivity,
}) {
  const metrics = DEMO_OVERVIEW_METRICS;

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-navy-850 via-navy-850 to-navy-800 border border-navy-700/80 rounded-2xl p-6 sm:p-7 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-electric-500/10 border border-electric-500/30 text-electric-300 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-electric-400" />
            <span>AI Autonomous Risk Triage & Review Guardrail</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            Catch Security Regressions & Logic Vulnerabilities Before Merge
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            PRism evaluates GitHub pull request diffs using semantic AST inspection, 
            rule heuristics, and multi-model verification to calculate actionable risk scores with evidence-backed code snippets.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNavigateToAnalyze}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white font-semibold text-xs sm:text-sm transition shadow-sm"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>Triage New Pull Request</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onSelectFixture && onSelectFixture(DEMO_PRS[0])}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 font-mono text-xs transition"
            >
              <Terminal className="w-3.5 h-3.5 text-electric-400" />
              <span>Preview Critical Fixture (94/100)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total PRs Triaged"
          value={metrics.totalAnalyzed}
          subtext="Across monitored repositories"
          icon={GitPullRequest}
          badge="+12 today"
          badgeVariant="electric"
        />

        <SummaryCard
          title="Critical Blockers"
          value={metrics.criticalBlocked}
          subtext="Prevented merge to production"
          icon={ShieldAlert}
          trend="-2 vs last week"
          trendPositive={true}
          badge="Gate Active"
          badgeVariant="danger"
        />

        <SummaryCard
          title="High Risk Flagged"
          value={metrics.highFlagged}
          subtext="Required mandatory senior signoff"
          icon={AlertOctagon}
          badge="16% of total"
          badgeVariant="warning"
        />

        <SummaryCard
          title="Avg Triage Latency"
          value={metrics.avgTriageLatency}
          subtext="Real-time diff evaluation"
          icon={Clock}
          badge="Sub-2s"
          badgeVariant="success"
        />
      </div>

      {/* Grid: Risk Distribution + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Risk Distribution Breakdown */}
        <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-750 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Risk Distribution</h3>
              <p className="text-xs text-slate-400">Classification breakdown of recent PRs</p>
            </div>
            <span className="text-xs font-mono text-slate-500">100% telemetry</span>
          </div>

          <RiskDistributionBar distribution={metrics.riskDistribution} />

          <div className="pt-2 border-t border-navy-750 space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Auto-passed (Clean)</span>
              <span className="text-emerald-400 font-semibold">{metrics.autoMergedSafe} PRs</span>
            </div>
            <div className="flex justify-between">
              <span>Required Remediation</span>
              <span className="text-orange-400 font-semibold">{metrics.criticalBlocked + metrics.highFlagged} PRs</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-2 bg-navy-850 border border-navy-700/80 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-750 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Triage Activity</h3>
              <p className="text-xs text-slate-400">Latest pull requests processed by PRism</p>
            </div>
            <button
              type="button"
              onClick={onNavigateToAnalyze}
              className="text-xs font-mono text-electric-400 hover:text-electric-300 transition flex items-center gap-1"
            >
              <span>Analyze URL</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-navy-750/70">
            {metrics.recentActivity.map((activity) => (
              <div
                key={activity.id}
                onClick={() => {
                  if (activity.fixtureId) {
                    const fixture = DEMO_PRS.find((f) => f.id === activity.fixtureId);
                    if (fixture && onSelectFixture) onSelectFixture(fixture);
                  } else {
                    onNavigateToAnalyze();
                  }
                }}
                className="py-3 flex items-center justify-between gap-4 hover:bg-navy-800/40 px-2 rounded-xl transition cursor-pointer group"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-300 group-hover:text-electric-300 transition truncate">
                      {activity.repo}#{activity.prNumber}
                    </span>
                    <SeverityBadge severity={activity.riskLevel} size="sm" />
                    <span className="text-[11px] font-mono text-slate-500">
                      @{activity.author}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate font-sans">
                    {activity.title}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-200 block">
                      {activity.riskScore}/100
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {activity.timeAgo}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-electric-400 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

