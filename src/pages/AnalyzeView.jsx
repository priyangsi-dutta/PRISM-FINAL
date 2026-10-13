import React, { useState } from 'react';
import { 
  GitPullRequest, 
  Terminal, 
  ShieldCheck, 
  Info, 
  ArrowLeft,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import PRUrlForm from '../components/PRUrlForm';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import ReportPanel from '../components/ReportPanel';
import { analyzePullRequest, normalizeAnalysisResponse } from '../services/api';
import { DEMO_PRS } from '../services/demoFixtures';

export default function AnalyzeView({
  currentAnalysis,
  setCurrentAnalysis,
  isDemoMode,
  setIsDemoMode,
  onNavigateToDashboard,
}) {
  const [targetUrl, setTargetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDemoFixtureActive, setIsDemoFixtureActive] = useState(false);

  const handleSubmitUrl = async (url) => {
    setTargetUrl(url);
    setIsLoading(true);
    setError(null);
    setIsDemoFixtureActive(false);

    // If currently in Demo Mode, check if URL matches one of our demo vectors
    if (isDemoMode) {
      setTimeout(() => {
        const matched = DEMO_PRS.find((d) => d.url.toLowerCase() === url.toLowerCase()) || DEMO_PRS[0];
        const normalized = normalizeAnalysisResponse(matched.data, url);
        setCurrentAnalysis(normalized);
        setIsDemoFixtureActive(true);
        setIsLoading(false);
      }, 1200);
      return;
    }

    try {
      // Live POST /api/analyze
      const result = await analyzePullRequest(url);
      setCurrentAnalysis(result);
      setIsDemoFixtureActive(false);
    } catch (err) {
      setError(err);
      setCurrentAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoFixture = (fixture) => {
    setTargetUrl(fixture.url);
    setError(null);
    setIsLoading(true);
    setIsDemoFixtureActive(true);

    // Simulate short network latency for realism
    setTimeout(() => {
      const normalized = normalizeAnalysisResponse(fixture.data, fixture.url);
      setCurrentAnalysis(normalized);
      setIsLoading(false);
    }, 750);
  };

  const handleRetry = () => {
    if (targetUrl) {
      handleSubmitUrl(targetUrl);
    }
  };

  const handleClearAnalysis = () => {
    setCurrentAnalysis(null);
    setError(null);
    setIsDemoFixtureActive(false);
  };

  return (
    <div className="space-y-6">
      {/* Search & URL Input Section (Visible when not showing an active report or user wants to re-input) */}
      {!currentAnalysis && !isLoading && (
        <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-mono text-electric-400 font-semibold uppercase tracking-wider">
              <GitPullRequest className="w-4 h-4" />
              <span>Real-time Risk Evaluation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Triage a GitHub Pull Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
              Enter any public or monitored repository pull request link to parse the diff, run vulnerability rules, and review composite risk.
            </p>
          </div>

          <PRUrlForm
            onSubmit={handleSubmitUrl}
            onSelectDemoFixture={handleSelectDemoFixture}
            isLoading={isLoading}
            initialUrl={targetUrl}
            isDemoMode={isDemoMode}
          />
        </div>
      )}

      {/* Loading State with Stage Pipeline */}
      {isLoading && (
        <LoadingSkeleton targetUrl={targetUrl} />
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          error={error}
          targetUrl={targetUrl}
          onRetry={handleRetry}
          onUseDemo={() => handleSelectDemoFixture(DEMO_PRS[0])}
        />
      )}

      {/* Active Analysis Report Panel */}
      {currentAnalysis && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClearAnalysis}
              className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-750 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Analyze Another PR</span>
            </button>

            <span className="text-xs font-mono text-slate-500">
              Evaluated: {new Date(currentAnalysis.analyzedAt).toLocaleTimeString()}
            </span>
          </div>

          <ReportPanel
            analysis={currentAnalysis}
            onReanalyze={handleRetry}
            onBackToSearch={handleClearAnalysis}
            isDemoMode={isDemoMode}
            isDemoFixture={isDemoFixtureActive}
          />
        </div>
      )}
    </div>
  );
}

