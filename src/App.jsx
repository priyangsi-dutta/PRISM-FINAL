import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewDashboard from './pages/OverviewDashboard';
import AnalyzeView from './pages/AnalyzeView';
import ReportPanel from './components/ReportPanel';
import { checkBackendHealth, normalizeAnalysisResponse } from './services/api';
import { DEMO_PRS } from './services/demoFixtures';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'analyze' | 'report'
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check backend health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    const verifyHealth = async () => {
      const isUp = await checkBackendHealth();
      if (isMounted) setBackendConnected(isUp);
    };

    verifyHealth();
    const interval = setInterval(verifyHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Keyboard accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '1') {
        e.preventDefault();
        setActiveView('dashboard');
      } else if ((e.metaKey || e.ctrlKey) && e.key === '2') {
        e.preventDefault();
        setActiveView('analyze');
      } else if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load a fixture into analysis and switch to report view
  const handleSelectFixture = (fixture) => {
    const normalized = normalizeAnalysisResponse(fixture.data, fixture.url);
    setCurrentAnalysis(normalized);
    setActiveView('report');
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex font-sans antialiased">
      {/* Reusable Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        onSelectView={(view) => setActiveView(view)}
        hasAnalysis={Boolean(currentAnalysis)}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Reusable Header */}
        <Header
          activeView={activeView}
          isDemoMode={isDemoMode}
          onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
          backendConnected={backendConnected}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          mobileMenuOpen={mobileMenuOpen}
        />

        {/* Content View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeView === 'dashboard' && (
            <OverviewDashboard
              onNavigateToAnalyze={() => setActiveView('analyze')}
              onSelectFixture={handleSelectFixture}
              onSelectRecentActivity={() => setActiveView('analyze')}
            />
          )}

          {activeView === 'analyze' && (
            <AnalyzeView
              currentAnalysis={currentAnalysis}
              setCurrentAnalysis={setCurrentAnalysis}
              isDemoMode={isDemoMode}
              setIsDemoMode={setIsDemoMode}
              onNavigateToDashboard={() => setActiveView('dashboard')}
            />
          )}

          {activeView === 'report' && (
            <div>
              {currentAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveView('analyze')}
                      className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-750 transition"
                    >
                      ← Analyze Another PR
                    </button>
                    <span className="text-xs font-mono text-slate-500">
                      Triage Report View
                    </span>
                  </div>

                  <ReportPanel
                    analysis={currentAnalysis}
                    onReanalyze={() => setActiveView('analyze')}
                    onBackToSearch={() => setActiveView('analyze')}
                    isDemoMode={isDemoMode}
                    isDemoFixture={true}
                  />
                </div>
              ) : (
                <div className="text-center py-16 bg-navy-850 border border-navy-750 rounded-2xl p-8 max-w-lg mx-auto space-y-4">
                  <h3 className="text-base font-semibold text-white">No Report Active</h3>
                  <p className="text-xs text-slate-400">
                    Analyze a pull request first to inspect the comprehensive triage report.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('analyze')}
                    className="px-4 py-2 bg-electric-600 hover:bg-electric-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Go to Analyze PR
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

