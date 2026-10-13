/**
 * PRism API Client Service
 * Handles communication with the PRism triage backend.
 * Configured via Vite environment variable: VITE_API_BASE_URL
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * Helper to extract repository name and PR number from a GitHub PR URL
 */
export function parseGitHubUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/.*)?$/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10),
    fullRepo: `${match[1]}/${match[2]}`,
  };
}

/**
 * Validates a GitHub pull request URL format
 */
export function isValidGitHubPRUrl(url) {
  return parseGitHubUrl(url) !== null;
}

/**
 * Calculates risk level string from numerical score (0-100) if not provided by backend
 */
function deriveRiskLevel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

/**
 * Normalizes backend response data defensively to preserve contracts
 * while handling snake_case, camelCase, or nested properties.
 */
export function normalizeAnalysisResponse(data, originalUrl) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response structure received from backend.');
  }

  const parsedUrl = parseGitHubUrl(originalUrl);
  const fallbackRepo = parsedUrl ? parsedUrl.fullRepo : 'Unknown Repository';
  const fallbackPrNum = parsedUrl ? parsedUrl.prNumber : null;

  // Extract score
  const rawScore = data.risk_score ?? data.riskScore ?? data.score ?? data.risk ?? 0;
  const riskScore = Math.min(100, Math.max(0, Number(rawScore) || 0));

  // Extract risk level
  const rawLevel = data.risk_level || data.riskLevel || data.level || deriveRiskLevel(riskScore);
  const riskLevel = String(rawLevel).toUpperCase();

  // Extract metadata
  const repoMeta = data.repository || data.repo || data.repo_metadata || data.repoMetadata || {};
  const repository = typeof repoMeta === 'string' 
    ? repoMeta 
    : (repoMeta.full_name || repoMeta.name || fallbackRepo);

  const prNumber = data.pr_number || data.prNumber || data.number || repoMeta.pr_number || fallbackPrNum;
  const title = data.title || data.pr_title || data.prTitle || repoMeta.title || `PR #${prNumber || 'Unknown'}`;
  const author = data.author || data.user || data.creator || repoMeta.author || 'Contributor';
  const baseBranch = data.base_branch || data.baseBranch || repoMeta.base || 'main';
  const headBranch = data.head_branch || data.headBranch || repoMeta.head || 'feature';
  const createdAt = data.created_at || data.createdAt || repoMeta.created_at || new Date().toISOString();

  // Extract AI summary
  const aiSummary = data.ai_summary || data.summary || data.overview || data.description || '';

  // Extract findings
  const rawFindings = Array.isArray(data.findings)
    ? data.findings
    : Array.isArray(data.issues)
    ? data.issues
    : Array.isArray(data.vulnerabilities)
    ? data.vulnerabilities
    : [];

  const findings = rawFindings.map((f, idx) => ({
    id: f.id || `finding-${idx + 1}`,
    title: f.title || f.rule || f.name || f.issue || 'Security Finding',
    severity: (f.severity || f.level || 'MEDIUM').toUpperCase(),
    category: f.category || f.type || 'Security & Compliance',
    filePath: f.file_path || f.filePath || f.file || f.filename || 'unknown',
    lineNumber: f.line_number ?? f.lineNumber ?? f.line ?? null,
    description: f.description || f.details || f.message || '',
    evidence: f.evidence || f.code || f.snippet || f.diff || '',
    recommendation: f.recommendation || f.suggestion || f.remediation || f.fix || '',
    cwe: f.cwe || f.cve || null,
  }));

  // Extract recommendations
  const rawRecommendations = Array.isArray(data.recommendations)
    ? data.recommendations
    : Array.isArray(data.action_items)
    ? data.action_items
    : Array.isArray(data.suggestions)
    ? data.suggestions
    : [];

  const recommendations = rawRecommendations.map((r, idx) => {
    if (typeof r === 'string') {
      return { id: `rec-${idx + 1}`, action: r, priority: 'HIGH', isBlocker: idx === 0 && riskScore >= 70 };
    }
    return {
      id: r.id || `rec-${idx + 1}`,
      action: r.action || r.title || r.text || r.recommendation || 'Remediation Step',
      priority: (r.priority || 'MEDIUM').toUpperCase(),
      isBlocker: Boolean(r.is_blocker || r.isBlocker || r.blocker),
      category: r.category || 'Reviewer Action',
    };
  });

  // Extract changed files
  const rawFiles = Array.isArray(data.changed_files)
    ? data.changed_files
    : Array.isArray(data.changedFiles)
    ? data.changedFiles
    : Array.isArray(data.files)
    ? data.files
    : [];

  const changedFiles = rawFiles.map((file, idx) => {
    if (typeof file === 'string') {
      return { filename: file, status: 'modified', additions: 0, deletions: 0, isSensitive: isSensitivePath(file) };
    }
    const name = file.filename || file.name || file.path || `file-${idx + 1}`;
    return {
      filename: name,
      status: file.status || 'modified',
      additions: file.additions ?? 0,
      deletions: file.deletions ?? 0,
      changes: file.changes ?? ((file.additions || 0) + (file.deletions || 0)),
      isSensitive: file.is_sensitive ?? file.isSensitive ?? isSensitivePath(name),
    };
  });

  // Extract metrics & stats
  const stats = data.stats || {
    totalFiles: changedFiles.length || (data.files_count ?? 0),
    additions: data.additions ?? changedFiles.reduce((acc, f) => acc + (f.additions || 0), 0),
    deletions: data.deletions ?? changedFiles.reduce((acc, f) => acc + (f.deletions || 0), 0),
    criticalFindings: findings.filter(f => f.severity === 'CRITICAL').length,
    highFindings: findings.filter(f => f.severity === 'HIGH').length,
    mediumFindings: findings.filter(f => f.severity === 'MEDIUM').length,
    lowFindings: findings.filter(f => f.severity === 'LOW').length,
  };

  return {
    url: originalUrl,
    repository,
    prNumber,
    title,
    author,
    baseBranch,
    headBranch,
    createdAt,
    riskScore,
    riskLevel,
    aiSummary,
    findings,
    recommendations,
    changedFiles,
    stats,
    raw: data, // Keep raw backend payload for debugging/inspection
    analyzedAt: new Date().toISOString(),
  };
}

function isSensitivePath(path) {
  if (!path) return false;
  const p = path.toLowerCase();
  return (
    p.includes('auth') ||
    p.includes('security') ||
    p.includes('token') ||
    p.includes('secret') ||
    p.includes('crypto') ||
    p.includes('jwt') ||
    p.includes('payment') ||
    p.includes('config') ||
    p.includes('.env') ||
    p.includes('permission') ||
    p.includes('rbac') ||
    p.includes('password')
  );
}

/**
 * Submits PR URL to POST /api/analyze with JSON { url: enteredUrl }
 */
export async function analyzePullRequest(enteredUrl) {
  if (!enteredUrl || typeof enteredUrl !== 'string') {
    throw new Error('Please enter a valid GitHub pull request URL.');
  }

  const trimmed = enteredUrl.trim();
  if (!isValidGitHubPRUrl(trimmed)) {
    throw new Error('URL must follow the format: https://github.com/:owner/:repo/pull/:id');
  }

  const endpoint = `${API_BASE_URL}/api/analyze`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ url: trimmed }),
    });

    if (!response.ok) {
      let errorDetail = `Backend responded with HTTP ${response.status} (${response.statusText})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error || errorJson.message || errorJson.detail) {
          errorDetail = errorJson.error || errorJson.message || errorJson.detail;
        }
      } catch {
        // Non-JSON response body
      }

      const err = new Error(errorDetail);
      err.status = response.status;
      throw err;
    }

    const json = await response.json();
    return normalizeAnalysisResponse(json, trimmed);
  } catch (error) {
    // Check if network failed completely (server not running)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error(
        `Unable to reach backend at ${endpoint}. Please ensure your triage server is running, or toggle Demo Mode to explore PRism with simulated live fixtures.`
      );
      networkError.isNetworkError = true;
      networkError.endpoint = endpoint;
      throw networkError;
    }
    throw error;
  }
}

/**
 * Check backend health status
 */
export async function checkBackendHealth() {
  try {
    const endpoint = `${API_BASE_URL}/api/health`;
    const res = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

