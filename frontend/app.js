/**
 * PRism — AI GitHub PR Risk Triage Dashboard
 * Frontend Application Logic (Vanilla JavaScript ES6+)
 * 
 * Features:
 * - Real API integration via fetch POST /api/analyze
 * - Optional Demo Mode with rich, labeled mock scenarios
 * - Multi-stage loading progress & error handling
 * - SVG radial risk score gauge animation
 * - Severity-filtered findings with diff evidence
 * - AI executive explanation & reviewer checklist
 * - Clipboard markdown export & file download
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. Mock Data for Demo Mode (Clearly Labeled)
  // =========================================================================
  const DEMO_PRESETS = {
    critical: {
      url: 'https://github.com/prism-sec/core-auth-service/pull/482',
      metadata: {
        title: 'refactor(auth): migrate token verification to v2 handler with fallback',
        number: 482,
        repo: 'prism-sec/core-auth-service',
        html_url: 'https://github.com/prism-sec/core-auth-service/pull/482',
        state: 'OPEN',
        head_branch: 'feature/auth-v2-migration',
        base_branch: 'main',
        author: {
          name: 'Alex Rivera',
          login: 'arivera-sec',
          initials: 'AR'
        },
        diff_stats: {
          additions: 342,
          deletions: 89,
          files_changed: 11
        },
        created_at: '2026-10-12T09:15:00Z',
        labels: ['security-sensitive', 'auth', 'needs-review']
      },
      risk_assessment: {
        score: 94,
        severity: 'critical',
        verdict: 'BLOCK MERGE',
        verdict_class: 'chip-block',
        summary: 'Critical authentication bypass hazard and secret handling flaw identified in token verification routine. Unconditional merge must be blocked until security sign-off.',
        confidence: '98%',
        breakdown: {
          security: 96,
          blast_radius: 88,
          drift: 72,
          test_deficit: 85
        }
      },
      ai_explanation: {
        executive_summary: 'PR #482 replaces the cryptographic signature check with an asynchronous fallback routine that defaults to true when verification fails under timeout conditions. Furthermore, user-supplied identity headers are parsed before signature verification, exposing the service to header-injection privilege escalation.',
        risk_drivers: [
          'Fallback bypass: JWT verification catches token expiration errors but omits invalid signature handling in catch block.',
          'Blast radius: All downstream internal microservices trusting the auth-service proxy will inherit unauthenticated sessions.',
          'Missing coverage: Modified signature validator contains zero newly added unit tests for malformed tokens.'
        ],
        checklist: [
          'Require strict RS256 algorithm enforcement; forbid "none" or symmetric fallback.',
          'Revert fallback logic in src/auth/jwt.service.ts line 58; never fail-open on signature mismatch.',
          'Add negative integration test cases verifying rejection of unsigned forged JWTs.',
          'Conduct peer review with SecOps team before merging.'
        ],
        blast_radius: {
          summary: 'High Ingress Threat • 4 Internal Microservices Exposed',
          modules: ['api-gateway', 'user-profile-service', 'billing-engine', 'session-redis']
        }
      },
      findings: [
        {
          id: 'F-101',
          severity: 'critical',
          category: 'Authentication Bypass',
          title: 'Fail-Open Signature Validation in Fallback Handler',
          description: 'The verification helper swallows signature mismatch exceptions during Redis lookup timeouts and returns a valid session object instead of aborting with HTTP 401 Unauthorized.',
          affected_files: ['src/auth/jwt.service.ts:54-62', 'src/middleware/auth.ts:18'],
          evidence_diff: `@@ -54,8 +54,10 @@ export async function verifyToken(token: string) {
   try {
     return await jwt.verify(token, PUBLIC_KEY);
   } catch (err) {
-    throw new UnauthorizedError('Invalid signature or expired token');
+    // Temporary fallback for legacy session migration
+    logger.warn('Token validation fallback triggered: ' + err.message);
+    return decodeUnverifiedToken(token); // VULNERABILITY: Returns untrusted payload!
   }`,
          remediation: 'Never use decodeUnverifiedToken as a fallback. If signature verification fails, reject immediately with UnauthorizedError.'
        },
        {
          id: 'F-102',
          severity: 'critical',
          category: 'CWE-89 SQL Injection',
          title: 'Unescaped User Filter in Role Lookup Query',
          description: 'Tenant identifier extracted from unverified header is interpolated directly into raw PostgreSQL query string.',
          affected_files: ['src/db/tenant.repository.ts:31-35'],
          evidence_diff: `@@ -31,5 +31,5 @@ export async function getTenantRoles(tenantId: string) {
-  return db.query('SELECT role FROM tenant_roles WHERE tenant_id = $1', [tenantId]);
+  // Optimized direct query
+  return db.query(\`SELECT role FROM tenant_roles WHERE tenant_id = '\${tenantId}'\`);`,
          remediation: 'Restore parameterized query ($1 placeholder) to prevent arbitrary SQL injection from forged tenant headers.'
        },
        {
          id: 'F-103',
          severity: 'high',
          category: 'Test Deficit',
          title: 'Significant Logic Shift Without Corresponding Test Suite',
          description: '11 core authentication and session handling files modified, but no new unit or integration tests were added in this branch.',
          affected_files: ['tests/auth.test.ts', 'src/auth/jwt.service.ts'],
          evidence_diff: `diff --stat
 src/auth/jwt.service.ts | 48 ++++++++++++++++++++++++++++++
 tests/auth.test.ts      |  0 (No modifications)`,
          remediation: 'Add comprehensive automated test suite covering expired, malformed, forged, and tampered token variations.'
        },
        {
          id: 'F-104',
          severity: 'medium',
          category: 'Information Disclosure',
          title: 'Raw Stack Trace & Token Logged to Production Stream',
          description: 'Logging user bearer token and full system stack trace on parsing exceptions poses compliance violations (GDPR/SOC2).',
          affected_files: ['src/utils/logger.ts:89'],
          evidence_diff: `@@ -89,2 +89,3 @@
-  logger.error('Auth failure occurred');
+  logger.error(\`Auth failed for token: \${token} - Stack: \${err.stack}\`);`,
          remediation: 'Mask or sanitize bearer tokens prior to writing log events.'
        }
      ]
    },

    high: {
      url: 'https://github.com/acme-corp/payment-service/pull/129',
      metadata: {
        title: 'perf(db): add ledger_transactions partition and rename account_uid column',
        number: 129,
        repo: 'acme-corp/payment-service',
        html_url: 'https://github.com/acme-corp/payment-service/pull/129',
        state: 'OPEN',
        head_branch: 'perf/db-partitioning',
        base_branch: 'main',
        author: {
          name: 'Sarah Chen',
          login: 'schen-db',
          initials: 'SC'
        },
        diff_stats: {
          additions: 184,
          deletions: 62,
          files_changed: 6
        },
        created_at: '2026-10-11T14:20:00Z',
        labels: ['database', 'breaking-change', 'migration']
      },
      risk_assessment: {
        score: 74,
        severity: 'high',
        verdict: 'REQUIRES STAGING SOAK',
        verdict_class: 'chip-caution',
        summary: 'Synchronous table lock hazard on high-volume transactions table and breaking schema rename without zero-downtime multi-phase deploy strategy.',
        confidence: '94%',
        breakdown: {
          security: 35,
          blast_radius: 92,
          drift: 88,
          test_deficit: 45
        }
      },
      ai_explanation: {
        executive_summary: 'PR #129 executes an exclusive ACCESS EXCLUSIVE lock on the primary transactions table in Postgres during migration. Under current production transaction rates (~2,400 TPS), this will induce request timeouts and cascading circuit breaks within seconds.',
        risk_drivers: [
          'Table Lock: "ALTER TABLE ledger_transactions RENAME COLUMN account_uid TO account_id" blocks read/write traffic during peak hours.',
          'Breaking API Schema: Renaming DB column immediately breaks running application pods not yet updated to new ORM model.',
          'Missing rollback plan: Migration script lacks safe down-migration without data loss.'
        ],
        checklist: [
          'Adopt expand-and-contract migration pattern: add new column, sync via triggers, backfill, then drop old column.',
          'Execute index creation using CREATE INDEX CONCURRENTLY to prevent read stalls.',
          'Schedule migration during lowest traffic window with maintenance banner.'
        ],
        blast_radius: {
          summary: 'Cascading Lock Hazard • Core Checkout & Billing Interruption',
          modules: ['checkout-api', 'subscription-cron', 'webhook-dispatcher', 'postgres-primary']
        }
      },
      findings: [
        {
          id: 'F-201',
          severity: 'high',
          category: 'Database Lock Risk',
          title: 'Unbuffered Column Rename on 40M Row Table',
          description: 'Direct ALTER TABLE statement acquires exclusive lock, queueing all concurrent payment processing transactions.',
          affected_files: ['migrations/20261011_partition_ledger.sql:12'],
          evidence_diff: `@@ -12,3 +12,3 @@
- -- Pending safe deprecation
+ ALTER TABLE ledger_transactions RENAME COLUMN account_uid TO account_id;`,
          remediation: 'Use a view or dual-writing column approach instead of renaming the column in place on high-throughput tables.'
        },
        {
          id: 'F-202',
          severity: 'high',
          category: 'Breaking Schema Drift',
          title: 'Immediate ORM Mapping Mismatch',
          description: 'Payment entity mapping in Go API server was updated simultaneously without backward-compatible JSON tag alias.',
          affected_files: ['pkg/models/transaction.go:44'],
          evidence_diff: `@@ -44,3 +44,3 @@ type Transaction struct {
-   AccountUID string \`json:"account_uid" db:"account_uid"\`
+   AccountID  string \`json:"account_id" db:"account_id"\``,
          remediation: 'Support both account_uid and account_id aliases in the deserializer for at least one release cycle.'
        },
        {
          id: 'F-203',
          severity: 'medium',
          category: 'Index Performance',
          title: 'Non-concurrent Index Creation on Partition Key',
          description: 'CREATE INDEX without CONCURRENTLY keyword prevents parallel write transactions.',
          affected_files: ['migrations/20261011_partition_ledger.sql:24'],
          evidence_diff: `@@ -24,2 +24,2 @@
+ CREATE INDEX idx_ledger_created_at ON ledger_transactions (created_at);`,
          remediation: 'Specify CREATE INDEX CONCURRENTLY idx_ledger_created_at ...'
        }
      ]
    },

    low: {
      url: 'https://github.com/oss-project/documentation/pull/77',
      metadata: {
        title: 'docs(api): update OpenAPI spec examples and add missing healthcheck test',
        number: 77,
        repo: 'oss-project/documentation',
        html_url: 'https://github.com/oss-project/documentation/pull/77',
        state: 'OPEN',
        head_branch: 'docs/openapi-examples',
        base_branch: 'main',
        author: {
          name: 'Jordan Miller',
          login: 'jmiller-dev',
          initials: 'JM'
        },
        diff_stats: {
          additions: 54,
          deletions: 12,
          files_changed: 3
        },
        created_at: '2026-10-13T08:00:00Z',
        labels: ['documentation', 'tests', 'low-risk']
      },
      risk_assessment: {
        score: 14,
        severity: 'low',
        verdict: 'SAFE TO MERGE',
        verdict_class: 'chip-pass',
        summary: 'Low-risk non-executable documentation clarifications and supplemental automated healthcheck assertions.',
        confidence: '99%',
        breakdown: {
          security: 5,
          blast_radius: 8,
          drift: 2,
          test_deficit: 0
        }
      },
      ai_explanation: {
        executive_summary: 'PR #77 touches documentation markdown, swagger yaml schemas, and introduces one non-flaky integration test for service liveness. Zero runtime logic or database schemas are altered.',
        risk_drivers: [
          'No production executable code paths modified.',
          'Healthy test-to-change ratio (+1 automated test for status endpoint).',
          'Zero new external dependencies or environment variables introduced.'
        ],
        checklist: [
          'Verify OpenAPI spec linter passes without schema syntax warnings.',
          'Review spelling and Markdown link validity.'
        ],
        blast_radius: {
          summary: 'Isolated Documentation Scope • Zero Runtime Impact',
          modules: ['developer-portal', 'docs-site']
        }
      },
      findings: [
        {
          id: 'F-301',
          severity: 'low',
          category: 'Documentation Drift',
          title: 'Minor Markdown Table Formatting Discrepancy',
          description: 'Trailing pipe character missing on row 48 of API authentication parameter table.',
          affected_files: ['docs/authentication.md:48'],
          evidence_diff: `@@ -47,3 +47,3 @@
 | client_id     | string  | OAuth client identifier |
-| client_secret | string  | Secret key issued
+| client_secret | string  | Secret key issued       |`,
          remediation: 'Ensure markdown table headers and rows maintain standard pipe delimitation.'
        }
      ]
    }
  };

  // =========================================================================
  // 2. Application State
  // =========================================================================
  const state = {
    isDemoMode: true, // Default to demo mode so beginners can immediately test without backend
    activePresetKey: 'critical',
    currentAnalysis: null,
    activeFilter: 'all',
    isLoading: false,
    loadingTimer: null
  };

  // =========================================================================
  // 3. DOM Element Selectors
  // =========================================================================
  const elements = {
    // Form & Controls
    triageForm: document.getElementById('triageForm'),
    prUrlInput: document.getElementById('prUrlInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    analyzeBtnText: document.getElementById('analyzeBtnText'),
    analyzeSpinner: document.getElementById('analyzeSpinner'),
    analyzeIcon: document.getElementById('analyzeIcon'),
    clearBtn: document.getElementById('clearBtn'),
    copyReportBtn: document.getElementById('copyReportBtn'),
    bottomCopyReportBtn: document.getElementById('bottomCopyReportBtn'),
    downloadReportBtn: document.getElementById('downloadReportBtn'),
    modeBanner: document.getElementById('modeBanner'),
    
    // Demo Mode Elements
    demoToggle: document.getElementById('demoToggle'),
    demoDescText: document.getElementById('demoDescText'),
    demoPresetsSection: document.getElementById('demoPresetsSection'),
    presetCriticalBtn: document.getElementById('presetCriticalBtn'),
    presetHighBtn: document.getElementById('presetHighBtn'),
    presetLowBtn: document.getElementById('presetLowBtn'),
    backendStatusDot: document.getElementById('backendStatusDot'),
    backendStatusLabel: document.getElementById('backendStatusLabel'),

    // Loading & Error States
    loadingCard: document.getElementById('loadingCard'),
    loadingStageTitle: document.getElementById('loadingStageTitle'),
    loadingStageDesc: document.getElementById('loadingStageDesc'),
    loadingProgressBar: document.getElementById('loadingProgressBar'),
    stepItems: [
      document.getElementById('step1'),
      document.getElementById('step2'),
      document.getElementById('step3'),
      document.getElementById('step4')
    ],
    errorBox: document.getElementById('errorBox'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    errorCloseBtn: document.getElementById('errorCloseBtn'),
    errorSwitchDemoBtn: document.getElementById('errorSwitchDemoBtn'),
    errorRetryBtn: document.getElementById('errorRetryBtn'),
    welcomeCard: document.getElementById('welcomeCard'),
    welcomeDemoTrigger: document.getElementById('welcomeDemoTrigger'),

    // Results Dashboard Sections
    resultsDashboard: document.getElementById('resultsDashboard'),

    // Risk Meter Elements
    riskVerdictBadge: document.getElementById('riskVerdictBadge'),
    gaugeCircle: document.getElementById('gaugeCircle'),
    scoreValue: document.getElementById('scoreValue'),
    severityBadge: document.getElementById('severityBadge'),
    scoreDescription: document.getElementById('scoreDescription'),
    aiConfidenceText: document.getElementById('aiConfidenceText'),

    // PR Metadata Elements
    prTitle: document.getElementById('prTitle'),
    prRepoName: document.getElementById('prRepoName'),
    prNumber: document.getElementById('prNumber'),
    prStateTag: document.getElementById('prStateTag'),
    prHeadBranch: document.getElementById('prHeadBranch'),
    prBaseBranch: document.getElementById('prBaseBranch'),
    authorAvatar: document.getElementById('authorAvatar'),
    authorName: document.getElementById('authorName'),
    authorLogin: document.getElementById('authorLogin'),
    diffAdditions: document.getElementById('diffAdditions'),
    diffDeletions: document.getElementById('diffDeletions'),
    diffFilesChanged: document.getElementById('diffFilesChanged'),
    prExternalLink: document.getElementById('prExternalLink'),

    // Vector Breakdown Elements
    vecSecurityVal: document.getElementById('vecSecurityVal'),
    vecSecurityBar: document.getElementById('vecSecurityBar'),
    vecBlastVal: document.getElementById('vecBlastVal'),
    vecBlastBar: document.getElementById('vecBlastBar'),
    vecDriftVal: document.getElementById('vecDriftVal'),
    vecDriftBar: document.getElementById('vecDriftBar'),
    vecTestVal: document.getElementById('vecTestVal'),
    vecTestBar: document.getElementById('vecTestBar'),

    // AI Explanation Elements
    aiVerdictStatusPill: document.getElementById('aiVerdictStatusPill'),
    aiExecutiveSummary: document.getElementById('aiExecutiveSummary'),
    aiRiskFactorsList: document.getElementById('aiRiskFactorsList'),
    aiChecklist: document.getElementById('aiChecklist'),
    blastRadiusScope: document.getElementById('blastRadiusScope'),
    impactedModulesList: document.getElementById('impactedModulesList'),

    // Findings Elements
    findingsList: document.getElementById('findingsList'),
    filterButtons: document.querySelectorAll('.filter-pill'),
    countAll: document.getElementById('countAll'),
    countCritical: document.getElementById('countCritical'),
    countHigh: document.getElementById('countHigh'),
    countMedium: document.getElementById('countMedium'),
    countLow: document.getElementById('countLow'),

    // Toast
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage')
  };

  // =========================================================================
  // 4. Utility Functions
  // =========================================================================

  /**
   * Simple HTML escaping to avoid injection when rendering text
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Validate GitHub Pull Request URL structure
   */
  function isValidGitHubPrUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const regex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+(\/.*)?$/i;
    return regex.test(url.trim());
  }

  /**
   * Show temporary Toast popup
   */
  let toastTimer = null;
  function showToast(message) {
    if (!elements.toastNotification) return;
    elements.toastMessage.textContent = message;
    elements.toastNotification.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toastNotification.classList.remove('show');
    }, 3200);
  }

  /**
   * Show or hide error notification banner
   */
  function showError(title, message) {
    elements.errorTitle.textContent = title || 'Analysis Request Failed';
    elements.errorMessage.textContent = message || 'An unexpected error occurred while communicating with the triage service.';
    elements.errorBox.style.display = 'flex';
    elements.errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideError() {
    elements.errorBox.style.display = 'none';
  }

  // =========================================================================
  // 5. Loading State Simulation & Rendering
  // =========================================================================
  const LOADING_STAGES = [
    { title: 'Connecting to GitHub API...', desc: 'Fetching PR metadata, commits, and unified git diff stream.', percent: 25 },
    { title: 'Parsing Abstract Syntax Tree...', desc: 'Analyzing modified modules, imports, and downstream dependencies.', percent: 55 },
    { title: 'Running Risk & CVE Heuristics...', desc: 'Scanning for authentication flaws, injections, and breaking schema drift.', percent: 80 },
    { title: 'Synthesizing AI Triage Report...', desc: 'Calculating aggregate risk score, blast radius, and reviewer guidance.', percent: 100 }
  ];

  function startLoading() {
    state.isLoading = true;
    hideError();
    elements.resultsDashboard.style.display = 'none';
    elements.welcomeCard.style.display = 'none';
    elements.loadingCard.style.display = 'flex';

    // Disable Analyze button
    elements.analyzeBtn.disabled = true;
    elements.analyzeSpinner.style.display = 'inline-block';
    elements.analyzeIcon.style.display = 'none';
    elements.analyzeBtnText.textContent = 'Triaging...';

    // Reset steps
    elements.stepItems.forEach(item => {
      item.classList.remove('active', 'completed');
    });
    elements.stepItems[0].classList.add('active');
    elements.loadingProgressBar.style.width = '20%';

    let currentStageIndex = 0;
    elements.loadingStageTitle.textContent = LOADING_STAGES[0].title;
    elements.loadingStageDesc.textContent = LOADING_STAGES[0].desc;

    // Advance step indicators periodically during fetch
    clearInterval(state.loadingTimer);
    state.loadingTimer = setInterval(() => {
      currentStageIndex++;
      if (currentStageIndex < LOADING_STAGES.length) {
        const stage = LOADING_STAGES[currentStageIndex];
        elements.loadingStageTitle.textContent = stage.title;
        elements.loadingStageDesc.textContent = stage.desc;
        elements.loadingProgressBar.style.width = stage.percent + '%';

        elements.stepItems.forEach((item, idx) => {
          if (idx < currentStageIndex) {
            item.classList.remove('active');
            item.classList.add('completed');
          } else if (idx === currentStageIndex) {
            item.classList.add('active');
            item.classList.remove('completed');
          }
        });
      }
    }, 450);
  }

  function stopLoading() {
    state.isLoading = false;
    clearInterval(state.loadingTimer);
    elements.loadingCard.style.display = 'none';

    // Re-enable Analyze button
    elements.analyzeBtn.disabled = false;
    elements.analyzeSpinner.style.display = 'none';
    elements.analyzeIcon.style.display = 'inline-block';
    elements.analyzeBtnText.textContent = 'Analyze PR';
  }

  // =========================================================================
  // 6. UI Rendering Engine
  // =========================================================================

  /**
   * Render PR Metadata Card
   */
  function renderMetadata(meta) {
    if (!meta) return;
    elements.prTitle.textContent = meta.title || 'Untitled Pull Request';
    elements.prRepoName.textContent = meta.repo || 'repository';
    elements.prNumber.textContent = meta.number ? `#${meta.number}` : '#--';
    elements.prStateTag.textContent = (meta.state || 'OPEN').toUpperCase();
    elements.prHeadBranch.textContent = meta.head_branch || 'feature';
    elements.prBaseBranch.textContent = meta.base_branch || 'main';

    if (meta.author) {
      elements.authorName.textContent = meta.author.name || meta.author.login || 'Contributor';
      elements.authorLogin.textContent = meta.author.login ? `@${meta.author.login}` : '';
      elements.authorAvatar.textContent = meta.author.initials || (meta.author.login ? meta.author.login.substring(0, 2).toUpperCase() : 'PR');
    }

    if (meta.diff_stats) {
      elements.diffAdditions.textContent = `+${meta.diff_stats.additions || 0}`;
      elements.diffDeletions.textContent = `-${meta.diff_stats.deletions || 0}`;
      elements.diffFilesChanged.textContent = `${meta.diff_stats.files_changed || 0} files`;
    }

    if (meta.html_url) {
      elements.prExternalLink.href = meta.html_url;
    }
  }

  /**
   * Render Risk Score Meter and Radial SVG Gauge
   */
  function renderRiskScore(risk) {
    if (!risk) return;
    const score = Math.max(0, Math.min(100, Math.round(risk.score || 0)));
    const severity = (risk.severity || 'low').toLowerCase();

    elements.scoreValue.textContent = score;
    elements.riskVerdictBadge.textContent = risk.verdict || 'REVIEW REQUIRED';
    elements.riskVerdictBadge.className = `card-chip ${risk.verdict_class || 'chip-caution'}`;

    // Update severity pill
    elements.severityBadge.textContent = `${severity.toUpperCase()} RISK`;
    elements.severityBadge.className = `severity-pill ${severity}`;

    elements.scoreDescription.textContent = risk.summary || 'Risk assessment complete.';
    elements.aiConfidenceText.textContent = risk.confidence || '95%';

    // Gauge circle animation (circumference is 2 * PI * 52 ≈ 326.72)
    const circumference = 326.72;
    const offset = circumference - (score / 100) * circumference;

    let strokeColor = '#10b981'; // low
    if (score >= 80) strokeColor = '#ef4444'; // critical
    else if (score >= 60) strokeColor = '#f97316'; // high
    else if (score >= 35) strokeColor = '#eab308'; // medium

    elements.gaugeCircle.style.stroke = strokeColor;
    elements.gaugeCircle.style.strokeDasharray = `${circumference}`;
    // Force reflow for smooth animation
    elements.gaugeCircle.getBoundingClientRect();
    elements.gaugeCircle.style.strokeDashoffset = `${offset}`;

    // Render Risk Breakdown Vectors
    const breakdown = risk.breakdown || { security: score, blast_radius: score, drift: 50, test_deficit: 40 };
    elements.vecSecurityVal.textContent = `${breakdown.security}%`;
    elements.vecSecurityBar.style.width = `${breakdown.security}%`;

    elements.vecBlastVal.textContent = `${breakdown.blast_radius}%`;
    elements.vecBlastBar.style.width = `${breakdown.blast_radius}%`;

    elements.vecDriftVal.textContent = `${breakdown.drift}%`;
    elements.vecDriftBar.style.width = `${breakdown.drift}%`;

    elements.vecTestVal.textContent = `${breakdown.test_deficit}%`;
    elements.vecTestBar.style.width = `${breakdown.test_deficit}%`;
  }

  /**
   * Render AI Explanation & Reviewer Guidance
   */
  function renderAiExplanation(ai, risk) {
    if (!ai) return;

    elements.aiExecutiveSummary.textContent = ai.executive_summary || 'No AI summary generated.';
    elements.aiVerdictStatusPill.textContent = (risk && risk.verdict) ? risk.verdict : 'TRIAGE COMPLETE';

    // Risk factors
    elements.aiRiskFactorsList.innerHTML = '';
    (ai.risk_drivers || []).forEach(factor => {
      const li = document.createElement('li');
      li.textContent = factor;
      elements.aiRiskFactorsList.appendChild(li);
    });

    // Reviewer checklist
    elements.aiChecklist.innerHTML = '';
    (ai.checklist || []).forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="checklist-box" aria-hidden="true"></span><span>${escapeHtml(item)}</span>`;
      elements.aiChecklist.appendChild(li);
    });

    // Blast Radius
    if (ai.blast_radius) {
      elements.blastRadiusScope.textContent = ai.blast_radius.summary || 'Calculated scope';
      elements.impactedModulesList.innerHTML = '';
      (ai.blast_radius.modules || []).forEach(mod => {
        const pill = document.createElement('span');
        pill.className = 'impact-pill';
        pill.textContent = mod;
        elements.impactedModulesList.appendChild(pill);
      });
    }
  }

  /**
   * Render Code Evidence Diff Block with highlighted syntax lines
   */
  function formatDiffHtml(diffText) {
    if (!diffText) return '<div class="diff-line">No diff snippet provided.</div>';
    const lines = diffText.split('\n');
    return lines.map(line => {
      const escaped = escapeHtml(line);
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return `<span class="diff-line diff-add">${escaped}</span>`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        return `<span class="diff-line diff-del">${escaped}</span>`;
      } else if (line.startsWith('@@')) {
        return `<span class="diff-line diff-highlight">${escaped}</span>`;
      }
      return `<span class="diff-line">${escaped}</span>`;
    }).join('');
  }

  /**
   * Render Findings List with active severity filter
   */
  function renderFindings(findings, filter = 'all') {
    if (!elements.findingsList) return;
    elements.findingsList.innerHTML = '';

    const allFindings = findings || [];

    // Calculate filter badge counts
    const counts = {
      all: allFindings.length,
      critical: allFindings.filter(f => (f.severity || '').toLowerCase() === 'critical').length,
      high: allFindings.filter(f => (f.severity || '').toLowerCase() === 'high').length,
      medium: allFindings.filter(f => (f.severity || '').toLowerCase() === 'medium').length,
      low: allFindings.filter(f => (f.severity || '').toLowerCase() === 'low').length
    };

    elements.countAll.textContent = counts.all;
    elements.countCritical.textContent = counts.critical;
    elements.countHigh.textContent = counts.high;
    elements.countMedium.textContent = counts.medium;
    elements.countLow.textContent = counts.low;

    // Apply filter
    const filtered = filter === 'all' 
      ? allFindings 
      : allFindings.filter(f => (f.severity || '').toLowerCase() === filter);

    if (filtered.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'card';
      emptyItem.style.textAlign = 'center';
      emptyItem.style.padding = '24px';
      emptyItem.style.color = '#94a3b8';
      emptyItem.innerHTML = `<p>No findings matching the <strong>${escapeHtml(filter.toUpperCase())}</strong> severity filter.</p>`;
      elements.findingsList.appendChild(emptyItem);
      return;
    }

    filtered.forEach(finding => {
      const sev = (finding.severity || 'low').toLowerCase();
      const card = document.createElement('article');
      card.className = `finding-item severity-${sev}`;

      const affectedFilesHtml = (finding.affected_files || []).map(f => {
        return `<span class="affected-file-pill">${escapeHtml(f)}</span>`;
      }).join('');

      card.innerHTML = `
        <div class="finding-header">
          <div class="finding-title-group">
            <h3 class="finding-title">${escapeHtml(finding.title)}</h3>
            <div class="finding-category-row">
              <span class="finding-badge ${sev}">${sev.toUpperCase()}</span>
              <span>Category: <strong>${escapeHtml(finding.category || 'Vulnerability')}</strong></span>
              ${finding.id ? `<span class="meta-tag">${escapeHtml(finding.id)}</span>` : ''}
            </div>
          </div>
        </div>

        <p class="finding-desc">${escapeHtml(finding.description)}</p>

        ${affectedFilesHtml ? `
        <div class="affected-files-container">
          <span class="affected-label">Affected Files:</span>
          ${affectedFilesHtml}
        </div>` : ''}

        ${finding.evidence_diff ? `
        <div class="evidence-container">
          <span class="evidence-label">Code Evidence / Diff Inspection:</span>
          <div class="code-diff-block">
            ${formatDiffHtml(finding.evidence_diff)}
          </div>
        </div>` : ''}

        ${finding.remediation ? `
        <div class="remediation-box">
          <svg style="width:16px;height:16px;flex-shrink:0;color:var(--accent-cyan);margin-top:2px;" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
          </svg>
          <div>
            <strong>AI Recommended Remediation:</strong> ${escapeHtml(finding.remediation)}
          </div>
        </div>` : ''}
      `;

      elements.findingsList.appendChild(card);
    });
  }

  /**
   * Main orchestrator to render the full analysis result
   */
  function renderAnalysisData(data) {
    if (!data) return;
    state.currentAnalysis = data;

    renderMetadata(data.metadata);
    renderRiskScore(data.risk_assessment);
    renderAiExplanation(data.ai_explanation, data.risk_assessment);
    renderFindings(data.findings, state.activeFilter);

    elements.welcomeCard.style.display = 'none';
    elements.resultsDashboard.style.display = 'flex';
  }

  // =========================================================================
  // 7. Analysis Dispatcher: Demo Mode vs Real API Fetch
  // =========================================================================

  /**
   * Perform analysis via POST /api/analyze with fetch
   * Handles timeouts, HTTP errors, and malformed responses
   */
  async function performAnalysis(url) {
    hideError();

    // 1. If in Demo Mode, simulate network latency and return mock data
    if (state.isDemoMode) {
      startLoading();

      // Check if URL matches a known demo preset, else default to selected preset
      let selectedPreset = DEMO_PRESETS[state.activePresetKey] || DEMO_PRESETS.critical;
      if (url.includes('482')) {
        selectedPreset = DEMO_PRESETS.critical;
      } else if (url.includes('129')) {
        selectedPreset = DEMO_PRESETS.high;
      } else if (url.includes('77')) {
        selectedPreset = DEMO_PRESETS.low;
      }

      // Simulate network response latency (1.4 seconds)
      await new Promise(resolve => setTimeout(resolve, 1400));
      stopLoading();
      renderAnalysisData(selectedPreset);
      showToast('Loaded mock triage report (Demo Mode)');
      return;
    }

    // 2. Real API Mode: fetch to POST /api/analyze
    startLoading();
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15s timeout

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: url.trim() }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      // Handle non-2xx HTTP responses
      if (!response.ok) {
        let errorDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.message) {
            errorDetail = errorJson.message;
          } else if (errorJson && errorJson.error) {
            errorDetail = errorJson.error;
          }
        } catch (_) {
          // If response body is not JSON, use text or status code
          const errorText = await response.text();
          if (errorText && errorText.length < 200) {
            errorDetail = errorText;
          }
        }

        stopLoading();
        showError(
          `Analysis Error (${response.status})`,
          `Backend returned an error: ${errorDetail}. Check your PR URL or verify your server configuration.`
        );
        return;
      }

      // Parse JSON response
      let resultData;
      try {
        resultData = await response.json();
      } catch (jsonErr) {
        stopLoading();
        showError(
          'Malformed Response',
          'Received invalid non-JSON output from /api/analyze. Ensure your backend returns valid JSON.'
        );
        return;
      }

      // Validate required schema properties
      if (!resultData || !resultData.risk_assessment) {
        stopLoading();
        showError(
          'Incomplete Analysis Data',
          'The response from /api/analyze is missing required triage fields (metadata, risk_assessment, findings).'
        );
        return;
      }

      stopLoading();
      renderAnalysisData(resultData);
      showToast('Live triage analysis completed successfully!');

    } catch (networkError) {
      clearTimeout(timeoutId);
      stopLoading();

      if (networkError.name === 'AbortError') {
        showError(
          'Request Timed Out',
          'The backend at /api/analyze took longer than 15 seconds to reply. The PR diff may be too large or the server is busy.'
        );
      } else {
        // Network connection error / backend offline
        showError(
          'Backend Server Not Reachable',
          `Could not connect to /api/analyze (${networkError.message}). If your backend is not running yet, toggle on Demo Mode to explore the full dashboard with mock data.`
        );
      }
    }
  }

  // =========================================================================
  // 8. Markdown Export & Report Generation
  // =========================================================================

  /**
   * Build formatted Markdown string for the current analysis
   */
  function generateMarkdownReport(data) {
    if (!data) return '';
    const meta = data.metadata || {};
    const risk = data.risk_assessment || {};
    const ai = data.ai_explanation || {};
    const findings = data.findings || [];

    const lines = [
      `# PRism Triage Report: ${meta.title || 'Pull Request'}`,
      `**Repository:** \`${meta.repo || 'N/A'}\` | **PR:** #${meta.number || 'N/A'} | **State:** ${meta.state || 'OPEN'}`,
      `**URL:** ${meta.html_url || 'N/A'}`,
      `**Author:** ${meta.author ? meta.author.name + ' (@' + meta.author.login + ')' : 'N/A'}`,
      `**Branches:** \`${meta.head_branch || 'feature'}\` ➔ \`${meta.base_branch || 'main'}\``,
      `**Diff Stats:** +${meta.diff_stats ? meta.diff_stats.additions : 0} / -${meta.diff_stats ? meta.diff_stats.deletions : 0} across ${meta.diff_stats ? meta.diff_stats.files_changed : 0} files`,
      '',
      '---',
      '',
      `## 🛡️ Risk Assessment: ${risk.score || 0}/100 (${(risk.severity || 'UNKNOWN').toUpperCase()})`,
      `**Verdict:** **${risk.verdict || 'PENDING'}**`,
      `**Confidence:** ${risk.confidence || 'N/A'}`,
      '',
      `> ${risk.summary || 'No risk summary provided.'}`,
      '',
      '### Risk Breakdown Vectors',
      `- **Security & Vulnerabilities:** ${risk.breakdown ? risk.breakdown.security : 0}%`,
      `- **Blast Radius & Regressions:** ${risk.breakdown ? risk.breakdown.blast_radius : 0}%`,
      `- **Breaking Schema / API Drift:** ${risk.breakdown ? risk.breakdown.drift : 0}%`,
      `- **Test Deficit & Observability:** ${risk.breakdown ? risk.breakdown.test_deficit : 0}%`,
      '',
      '---',
      '',
      '## 🧠 AI Executive Summary & Rationale',
      ai.executive_summary || '',
      '',
      '### Key Risk Drivers',
      ...(ai.risk_drivers || []).map(driver => `- ⚠️ ${driver}`),
      '',
      '### Reviewer Pre-Merge Checklist',
      ...(ai.checklist || []).map(item => `- [ ] ${item}`),
      '',
      '---',
      '',
      `## 🔍 Findings & Evidence (${findings.length} Total)`,
      ''
    ];

    findings.forEach((finding, index) => {
      lines.push(`### ${index + 1}. [${(finding.severity || 'LOW').toUpperCase()}] ${finding.title}`);
      lines.push(`- **Category:** ${finding.category || 'General Risk'}`);
      if (finding.affected_files && finding.affected_files.length) {
        lines.push(`- **Affected Files:** ${finding.affected_files.map(f => '`' + f + '`').join(', ')}`);
      }
      lines.push('');
      lines.push(`**Description:** ${finding.description}`);
      lines.push('');
      if (finding.evidence_diff) {
        lines.push('```diff');
        lines.push(finding.evidence_diff);
        lines.push('```');
        lines.push('');
      }
      if (finding.remediation) {
        lines.push(`**Remediation:** ${finding.remediation}`);
        lines.push('');
      }
    });

    lines.push('---');
    lines.push(`*Generated by PRism AI PR Risk Triage Engine on ${new Date().toISOString()}*`);

    return lines.join('\n');
  }

  /**
   * Copy report to clipboard
   */
  async function copyReportToClipboard() {
    if (!state.currentAnalysis) {
      showToast('No active triage analysis to copy');
      return;
    }

    const markdown = generateMarkdownReport(state.currentAnalysis);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = markdown;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('Triage report copied to clipboard as Markdown!');
    } catch (err) {
      showToast('Failed to copy to clipboard.');
    }
  }

  /**
   * Download report as a .md file
   */
  function downloadReportFile() {
    if (!state.currentAnalysis) {
      showToast('No active triage analysis to download');
      return;
    }

    const markdown = generateMarkdownReport(state.currentAnalysis);
    const prNum = state.currentAnalysis.metadata && state.currentAnalysis.metadata.number 
      ? state.currentAnalysis.metadata.number 
      : 'report';
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PRism-Triage-Report-PR${prNum}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded PRism-Triage-Report-PR${prNum}.md`);
  }

  // =========================================================================
  // 9. Event Listeners & Interactive Handlers
  // =========================================================================

  function updateDemoModeUI() {
    if (state.isDemoMode) {
      elements.demoDescText.innerHTML = 'Testing mode active with local mock data. Turn off to connect to live <code class="code-inline">/api/analyze</code>.';
      elements.modeBanner.style.display = 'flex';
      elements.demoPresetsSection.style.display = 'flex';
      elements.backendStatusDot.className = 'backend-indicator';
      elements.backendStatusLabel.textContent = 'Demo Mode Active';
    } else {
      elements.demoDescText.innerHTML = 'Live API mode active. All submissions will POST to <code class="code-inline">/api/analyze</code>.';
      elements.modeBanner.style.display = 'none';
      elements.demoPresetsSection.style.display = 'none';
      elements.backendStatusDot.className = 'backend-indicator live';
      elements.backendStatusLabel.textContent = 'API Mode: /api/analyze';
    }
  }

  function setupEventListeners() {
    // 1. Form Submission
    elements.triageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredUrl = elements.prUrlInput.value.trim();

      if (!enteredUrl) {
        showError('Input Required', 'Please enter a GitHub Pull Request URL.');
        elements.prUrlInput.focus();
        return;
      }

      // URL syntax check
      if (!isValidGitHubPrUrl(enteredUrl) && !state.isDemoMode) {
        showError(
          'Invalid GitHub URL Format',
          'Please enter a valid pull request URL (e.g., https://github.com/organization/repository/pull/123).'
        );
        elements.prUrlInput.focus();
        return;
      }

      performAnalysis(enteredUrl);
    });

    // 2. Demo Mode Toggle
    elements.demoToggle.addEventListener('change', (e) => {
      state.isDemoMode = e.target.checked;
      updateDemoModeUI();
      showToast(state.isDemoMode ? 'Demo Mode enabled (using mock data)' : 'Live API mode enabled (connecting to /api/analyze)');
    });

    // 3. Preset Buttons (Critical, High, Low)
    const presetButtons = [
      { btn: elements.presetCriticalBtn, key: 'critical' },
      { btn: elements.presetHighBtn, key: 'high' },
      { btn: elements.presetLowBtn, key: 'low' }
    ];

    presetButtons.forEach(({ btn, key }) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        state.activePresetKey = key;
        presetButtons.forEach(p => p.btn.classList.remove('active'));
        btn.classList.add('active');

        const preset = DEMO_PRESETS[key];
        elements.prUrlInput.value = preset.url;
        performAnalysis(preset.url);
      });
    });

    // 4. Quick Chip Buttons in helper text
    document.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        const url = chip.getAttribute('data-url');
        if (url) {
          elements.prUrlInput.value = url;
          performAnalysis(url);
        }
      });
    });

    // 5. Findings Filter Tabs
    elements.filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeFilter = btn.getAttribute('data-filter') || 'all';
        if (state.currentAnalysis) {
          renderFindings(state.currentAnalysis.findings, state.activeFilter);
        }
      });
    });

    // 6. Action Buttons
    elements.copyReportBtn.addEventListener('click', copyReportToClipboard);
    elements.bottomCopyReportBtn.addEventListener('click', copyReportToClipboard);
    elements.downloadReportBtn.addEventListener('click', downloadReportFile);

    // 7. Reset / Clear Button
    elements.clearBtn.addEventListener('click', () => {
      state.currentAnalysis = null;
      elements.resultsDashboard.style.display = 'none';
      elements.welcomeCard.style.display = 'flex';
      hideError();
      showToast('Dashboard reset to welcome view.');
    });

    // 8. Error Card Controls
    elements.errorCloseBtn.addEventListener('click', hideError);
    elements.errorSwitchDemoBtn.addEventListener('click', () => {
      state.isDemoMode = true;
      elements.demoToggle.checked = true;
      updateDemoModeUI();
      hideError();
      performAnalysis(elements.prUrlInput.value || DEMO_PRESETS.critical.url);
    });
    elements.errorRetryBtn.addEventListener('click', () => {
      hideError();
      performAnalysis(elements.prUrlInput.value);
    });

    // 9. Welcome Trigger Button
    if (elements.welcomeDemoTrigger) {
      elements.welcomeDemoTrigger.addEventListener('click', () => {
        performAnalysis(elements.prUrlInput.value || DEMO_PRESETS.critical.url);
      });
    }

    // 10. Enter key submission in URL field
    elements.prUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        elements.analyzeBtn.click();
      }
    });
  }

  // =========================================================================
  // 10. Initialization
  // =========================================================================
  function init() {
    setupEventListeners();
    updateDemoModeUI();

    // Auto-load default critical preset so the user sees a complete, rich dashboard immediately
    if (state.isDemoMode) {
      renderAnalysisData(DEMO_PRESETS.critical);
    } else {
      elements.welcomeCard.style.display = 'flex';
      elements.resultsDashboard.style.display = 'none';
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
