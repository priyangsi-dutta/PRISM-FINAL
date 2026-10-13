"""
PRism — Risk Analyzer
Deterministic, explainable heuristic analysis engine for GitHub Pull Requests.
Evaluates diff volume, sensitive files, dependency manifests, testing ratios, and code patterns.
"""

import re
from typing import Dict, Any, List, Tuple
from backend.schemas import (
    PullRequestMetadata,
    AuthorInfo,
    DiffStats,
    RiskAssessment,
    RiskBreakdown,
    Finding,
    BlastRadiusInfo
)


# Known sensitive file patterns
SENSITIVE_PATTERNS = [
    (r"(^|/)\.env(\..+)?$", "Environment secrets or credentials file", "critical"),
    (r"(^|/)(id_rsa|id_dsa|.*\.pem|.*\.key|.*\.p12|.*\.pfx)$", "Cryptographic private key or certificate", "critical"),
    (r"(^|/)credentials\.json$", "Service account credentials", "critical"),
    (r"(^|/)\.github/workflows/.*\.ya?ml$", "CI/CD pipeline workflow configuration", "high"),
    (r"(^|/)(Dockerfile|docker-compose.*\.ya?ml)$", "Container runtime configuration", "medium"),
    (r"(^|/)(auth|security|oauth|jwt|permissions)/.*", "Core authentication or authorization logic", "high"),
    (r"(^|/)(migrations?|schema)/.*\.sql$", "Database schema migration script", "high"),
]

# Manifest files for dependency checks
DEPENDENCY_MANIFESTS = {
    "package.json": "npm/javascript",
    "package-lock.json": "npm/javascript",
    "requirements.txt": "python/pip",
    "Pipfile": "python/pipenv",
    "pyproject.toml": "python/poetry",
    "go.mod": "go",
    "pom.xml": "java/maven",
    "build.gradle": "java/gradle",
    "Cargo.toml": "rust/cargo",
}

# Known typosquatting & risky patterns in dependency additions
SUSPICIOUS_DEPENDENCY_PATTERNS = [
    # Common typosquatting targets
    (r"^\+.*[\"'](reqeusts|requsts|reque-sts|reqwest)[\"']", "Possible typosquatting of 'requests' package"),
    (r"^\+.*[\"'](lodsh|loadash|loda-sh)[\"']", "Possible typosquatting of 'lodash' package"),
    (r"^\+.*[\"'](colros|collor|colour-js)[\"']", "Possible typosquatting of 'colors' package"),
    (r"^\+.*[\"'](expresss|expre-ss)[\"']", "Possible typosquatting of 'express' package"),
    (r"^\+.*[\"'](chalkk|cha-lk)[\"']", "Possible typosquatting of 'chalk' package"),
    # Non-HTTPS / Raw IP git URLs
    (r"^\+.*git\+http://\d+\.\d+\.\d+\.\d+", "Unencrypted raw IP git dependency reference"),
    (r"^\+.*http://[a-zA-Z0-9.-]+\.onion", "Onion routing dependency source"),
]

# Sensitive patterns inside added code diffs (lines starting with +)
SECRET_DIFF_PATTERNS = [
    (r"^\+.*-----BEGIN (?:RSA )?PRIVATE KEY-----", "Private cryptographic key embedded in patch", "critical"),
    (r"^\+.*(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}", "GitHub Personal Access Token pattern detected", "critical"),
    (r"^\+.*AKIA[0-9A-Z]{16}", "AWS Access Key ID pattern detected", "critical"),
    (r"(?i)^\+.*(?:api[_-]?key|secret[_-]?key|client[_-]?secret)\s*[:=]\s*['\"][a-zA-Z0-9_\-]{20,}['\"]", "High-entropy API key or secret assignment", "high"),
]

# Dangerous or risky execution patterns in code diffs
CODE_HAZARD_PATTERNS = [
    (r"^\+.*\b(?:eval|exec)\s*\(", "Dynamic code execution (eval/exec) added", "high"),
    (r"^\+.*\bsubprocess\.(?:Popen|call|run)\s*\([^)]*shell\s*=\s*True", "Shell command execution with shell=True", "high"),
    (r"^\+.*\bos\.system\s*\(", "Direct system command execution (os.system)", "medium"),
    (r"(?i)^\+.*dangerouslySetInnerHTML", "Unsanitized HTML injection risk in UI component", "medium"),
]


def normalize_metadata(raw_pr: Dict[str, Any]) -> PullRequestMetadata:
    """
    Transforms GitHub PR API response into normalized PullRequestMetadata model.
    """
    user_data = raw_pr.get("user") or {}
    login = user_data.get("login", "contributor")
    initials = login[:2].upper() if login else "PR"

    head_ref = (raw_pr.get("head") or {}).get("ref", "feature-branch")
    base_ref = (raw_pr.get("base") or {}).get("ref", "main")
    base_repo = (raw_pr.get("base") or {}).get("repo") or {}
    repo_full_name = base_repo.get("full_name") or f"{raw_pr.get('owner', 'unknown')}/repo"

    labels_list = [l.get("name", "") for l in (raw_pr.get("labels") or []) if isinstance(l, dict)]

    return PullRequestMetadata(
        title=raw_pr.get("title") or "Untitled Pull Request",
        number=raw_pr.get("number", 0),
        repo=repo_full_name,
        html_url=raw_pr.get("html_url") or "",
        state=(raw_pr.get("state") or "open").upper(),
        head_branch=head_ref,
        base_branch=base_ref,
        author=AuthorInfo(
            name=user_data.get("name") or login,
            login=login,
            initials=initials,
            avatar_url=user_data.get("avatar_url")
        ),
        diff_stats=DiffStats(
            additions=raw_pr.get("additions", 0),
            deletions=raw_pr.get("deletions", 0),
            files_changed=raw_pr.get("changed_files", 0)
        ),
        created_at=raw_pr.get("created_at") or "",
        updated_at=raw_pr.get("updated_at"),
        labels=labels_list
    )


def extract_diff_lines(patch: str) -> List[str]:
    """
    Extracts added (+) and deleted (-) lines from a git unified diff patch.
    """
    if not patch:
        return []
    return [line for line in patch.splitlines() if line.startswith(("+", "-"))]


def evaluate_diff_signals(
    pr_meta: PullRequestMetadata, files: List[Dict[str, Any]]
) -> Tuple[List[Finding], Dict[str, int]]:
    """
    Runs deterministic heuristic signal checks across changed files and metadata.
    Returns (findings_list, dimension_scores).
    """
    findings: List[Finding] = []
    finding_counter = 1

    total_adds = pr_meta.diff_stats.additions
    total_dels = pr_meta.diff_stats.deletions
    total_lines = total_adds + total_dels
    file_count = pr_meta.diff_stats.files_changed or len(files)

    sec_score = 0
    blast_score = 0
    drift_score = 0
    test_score = 0

    # ---------------------------------------------------------
    # 1. Empty / Zero Impact Check
    # ---------------------------------------------------------
    if total_lines == 0 or file_count == 0:
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity="low",
            category="Empty PR",
            title="Pull request contains no code or file changes",
            description="The pull request reports 0 additions and 0 deletions. May be an empty branch merge or misconfigured branch pointer.",
            affected_files=[],
            evidence_diff=None,
            remediation="Verify that commits were pushed to the head branch before requesting review."
        ))
        finding_counter += 1
        return findings, {"security": 0, "blast_radius": 0, "drift": 0, "test_deficit": 0}

    # ---------------------------------------------------------
    # 2. Diff Volume & Blast Radius Check
    # ---------------------------------------------------------
    if total_lines > 3500 or file_count > 45:
        blast_score += 45
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity="critical",
            category="Diff Volume",
            title="Unusually massive diff surface (>3,500 lines or >45 files)",
            description=(
                f"PR touches {total_lines:,} lines across {file_count} files (+{total_adds:,} / -{total_dels:,}). "
                "Large diffs significantly degrade reviewer attention and elevate regression risk. "
                "This heuristic signal highlights review complexity and does not imply malicious intent."
            ),
            affected_files=[f["filename"] for f in files[:8]],
            evidence_diff=f"Diff Summary:\n+ Total Additions: {total_adds:,}\n- Total Deletions: {total_dels:,}\n• Changed Files: {file_count}",
            remediation="Consider decomposing this pull request into smaller, independently reviewable modular changes."
        ))
        finding_counter += 1
    elif total_lines > 1200 or file_count > 20:
        blast_score += 30
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity="high",
            category="Diff Volume",
            title="Large change surface (>1,200 lines or >20 files)",
            description=(
                f"PR introduces {total_lines:,} total modifications across {file_count} files. "
                "Substantial changes increase the probability of unintended cross-component side effects."
            ),
            affected_files=[f["filename"] for f in files[:5]],
            evidence_diff=f"Diff Stats: +{total_adds:,} / -{total_dels:,} ({file_count} files)",
            remediation="Ensure integration test suites run across all touched service boundaries."
        ))
        finding_counter += 1
    elif total_lines > 400:
        blast_score += 15

    # ---------------------------------------------------------
    # 3. Sensitive Files Check
    # ---------------------------------------------------------
    sensitive_files_found: List[str] = []
    for f in files:
        fname = f.get("filename", "")
        for pattern, label, sev in SENSITIVE_PATTERNS:
            if re.search(pattern, fname, re.IGNORECASE):
                sensitive_files_found.append(f"{fname} ({label})")
                if sev == "critical":
                    sec_score += 35
                elif sev == "high":
                    sec_score += 20
                    blast_score += 15
                else:
                    drift_score += 15

    if sensitive_files_found:
        highest_sev = "critical" if any("critical" in s for s in sensitive_files_found) else "high"
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity=highest_sev,
            category="Sensitive File Modification",
            title=f"Sensitive system or security configuration modified ({len(sensitive_files_found)} files)",
            description=(
                f"The PR modifies sensitive files: {', '.join(sensitive_files_found[:4])}. "
                "Changes to workflows, credential stores, or security handlers warrant dedicated domain-expert audit."
            ),
            affected_files=[s.split(" ")[0] for s in sensitive_files_found[:6]],
            evidence_diff=None,
            remediation="Perform focused security review on modified workflow permissions and secret injection logic."
        ))
        finding_counter += 1

    # ---------------------------------------------------------
    # 4. Dependency Manifests & Package Heuristics
    # ---------------------------------------------------------
    dep_findings_count = 0
    for f in files:
        fname = f.get("filename", "")
        basename = fname.split("/")[-1]
        if basename in DEPENDENCY_MANIFESTS:
            drift_score += 15
            patch = f.get("patch", "")
            added_lines = [l for l in patch.splitlines() if l.startswith("+") and not l.startswith("+++")]

            # Check suspicious patterns in added dependencies
            for line in added_lines:
                for pattern, note in SUSPICIOUS_DEPENDENCY_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        sec_score += 25
                        findings.append(Finding(
                            id=f"F-{finding_counter:03d}",
                            severity="high",
                            category="Suspicious Dependency",
                            title=f"Heuristic Flag: {note}",
                            description=(
                                f"A dependency addition in {fname} matched a verifiable anomaly pattern: {note}. "
                                "This is a heuristic warning intended for reviewer verification; it does not constitute proof of malicious intent."
                            ),
                            affected_files=[fname],
                            evidence_diff=line,
                            remediation="Confirm the package name against the authoritative package registry (npm, PyPI, Crates.io) and review package provenance."
                        ))
                        finding_counter += 1
                        dep_findings_count += 1
                        break

    # ---------------------------------------------------------
    # 5. Patch Content Heuristics (Secrets & Dangerous Execs)
    # ---------------------------------------------------------
    for f in files:
        patch = f.get("patch", "")
        if not patch:
            continue
        fname = f.get("filename", "")

        # Secrets check in additions
        for pattern, note, sev in SECRET_DIFF_PATTERNS:
            match = re.search(pattern, patch, re.MULTILINE)
            if match:
                sec_score += 35
                snippet = match.group(0)[:120]
                findings.append(Finding(
                    id=f"F-{finding_counter:03d}",
                    severity=sev,
                    category="Exposed Secret / Key",
                    title=f"Potential credential or secret pattern detected: {note}",
                    description=(
                        f"Found matching signature in added lines of {fname}. "
                        "Committing unencrypted secrets to git history creates immediate exposure risk."
                    ),
                    affected_files=[fname],
                    evidence_diff=snippet,
                    remediation="Immediately revoke any exposed credentials, remove from commit history, and inject via environment variables or secret vaults."
                ))
                finding_counter += 1
                break

        # Dangerous execution patterns
        for pattern, note, sev in CODE_HAZARD_PATTERNS:
            match = re.search(pattern, patch, re.MULTILINE)
            if match:
                sec_score += 18
                snippet = match.group(0)[:120]
                findings.append(Finding(
                    id=f"F-{finding_counter:03d}",
                    severity=sev,
                    category="Code Execution Hazard",
                    title=f"Heuristic Hazard: {note}",
                    description=(
                        f"Added line in {fname} invokes potentially unsafe execution primitive. "
                        "Ensure user-controlled input cannot reach execution arguments."
                    ),
                    affected_files=[fname],
                    evidence_diff=snippet,
                    remediation="Sanitize all inputs and replace dynamic evaluation with typed parsers or parameter arrays."
                ))
                finding_counter += 1
                break

    # ---------------------------------------------------------
    # 6. Test Deficit & Deletion Ratio Check
    # ---------------------------------------------------------
    code_files = [f for f in files if not re.search(r"(test|spec|docs?|README|\.md$)", f.get("filename", ""), re.IGNORECASE)]
    test_files = [f for f in files if re.search(r"(test|spec|\.test\.|\.spec\.)", f.get("filename", ""), re.IGNORECASE)]

    if len(code_files) >= 4 and len(test_files) == 0 and total_adds > 150:
        test_score += 35
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity="medium",
            category="Test Deficit",
            title="Significant application logic added without new unit or integration tests",
            description=(
                f"PR modifies {len(code_files)} source files (+{total_adds} lines) but does not include updates to test suites. "
                "Unchecked code increases regression probability in CI and production."
            ),
            affected_files=[f["filename"] for f in code_files[:5]],
            evidence_diff=f"Modified Source Files: {len(code_files)}\nModified Test Files: 0\nNew Additions: +{total_adds}",
            remediation="Add automated unit or integration tests verifying newly introduced code paths."
        ))
        finding_counter += 1

    # High deletion ratio
    if total_lines > 200 and total_dels > (total_adds * 4):
        drift_score += 25
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity="medium",
            category="High Deletion Ratio",
            title=f"Asymmetric code removal detected (-{total_dels} / +{total_adds})",
            description="Large removals without proportional replacement may indicate deleted functionality or stripped tests.",
            affected_files=[f["filename"] for f in files[:4]],
            evidence_diff=None,
            remediation="Verify that deprecated features have appropriate migration paths or deprecation warnings."
        ))
        finding_counter += 1

    # Baseline adjustment for clean small changes
    if not findings:
        findings.append(Finding(
            id=f"F-{finding_counter:03d}",
            severity="low",
            category="Routine Change",
            title="Standard diff volume and clean heuristic profile",
            description="No sensitive files, credential patterns, or suspicious dependencies were detected by heuristic scanners.",
            affected_files=[f["filename"] for f in files[:4]],
            evidence_diff=None,
            remediation="Proceed with standard code review and automated CI validation."
        ))

    return findings, {
        "security": min(100, sec_score),
        "blast_radius": min(100, blast_score),
        "drift": min(100, drift_score),
        "test_deficit": min(100, test_score)
    }


def calculate_overall_risk(
    findings: List[Finding], breakdown: Dict[str, int]
) -> Tuple[int, str, str, str, str]:
    """
    Computes aggregate risk score (0-100), severity level, verdict, and badge class.
    """
    # Severity weights
    weights = {"critical": 35, "high": 20, "medium": 10, "low": 2, "info": 0}
    severity_sum = sum(weights.get(f.severity.lower(), 5) for f in findings)
    
    # Vector weight average
    vector_avg = (
        breakdown.get("security", 0) * 0.40
        + breakdown.get("blast_radius", 0) * 0.25
        + breakdown.get("drift", 0) * 0.20
        + breakdown.get("test_deficit", 0) * 0.15
    )

    combined_score = int(round(min(100, (severity_sum * 0.55) + (vector_avg * 0.45))))

    if any(f.category == "Empty PR" for f in findings):
        combined_score = 0
    elif any(f.severity.lower() == "critical" for f in findings):
        combined_score = max(combined_score, 82)
    elif any(f.severity.lower() == "high" for f in findings):
        combined_score = max(combined_score, 62)

    # Classification
    if combined_score >= 80:
        severity = "critical"
        verdict = "BLOCK MERGE"
        verdict_class = "chip-block"
        summary = "High-severity vulnerabilities or critical changes detected. Require security and peer sign-off before merge."
    elif combined_score >= 60:
        severity = "high"
        verdict = "REQUIRES STAGING SOAK"
        verdict_class = "chip-caution"
        summary = "Elevated risk signals detected. Verify blast radius and execute full test regression suite."
    elif combined_score >= 35:
        severity = "medium"
        verdict = "MANUAL REVIEW RECOMMENDED"
        verdict_class = "chip-caution"
        summary = "Moderate change complexity. Standard reviewer scrutiny recommended."
    else:
        severity = "low"
        verdict = "SAFE TO MERGE"
        verdict_class = "chip-pass"
        summary = "Low-risk changes with minimal blast radius. Safe to proceed after standard CI passes."

    return combined_score, severity, verdict, verdict_class, summary


def generate_recommendations(findings: List[Finding], risk_level: str) -> List[str]:
    """
    Synthesizes actionable recommendations based on findings.
    """
    recs: List[str] = []
    for f in findings:
        if f.remediation and f.remediation not in recs:
            recs.append(f.remediation)

    if risk_level in ("critical", "high"):
        recs.append("Conduct synchronous code review session with repository maintainers.")
        recs.append("Ensure branch passes complete automated end-to-end regression testing.")
    else:
        recs.append("Verify all automated GitHub Actions checks report green status.")

    return recs[:5]


def analyze_pull_request(
    raw_pr: Dict[str, Any], files: List[Dict[str, Any]]
) -> Tuple[PullRequestMetadata, RiskAssessment, List[Finding], List[str], BlastRadiusInfo]:
    """
    Entry point for deterministic pull request risk analysis.
    """
    pr_meta = normalize_metadata(raw_pr)
    findings, breakdown_scores = evaluate_diff_signals(pr_meta, files)
    score, severity, verdict, verdict_class, summary_text = calculate_overall_risk(findings, breakdown_scores)

    risk_assessment = RiskAssessment(
        score=score,
        severity=severity,
        verdict=verdict,
        verdict_class=verdict_class,
        summary=summary_text,
        confidence="95%",
        breakdown=RiskBreakdown(
            security=breakdown_scores["security"],
            blast_radius=breakdown_scores["blast_radius"],
            drift=breakdown_scores["drift"],
            test_deficit=breakdown_scores["test_deficit"]
        )
    )

    recommendations = generate_recommendations(findings, severity)

    # Blast radius summary
    touched_dirs = list({f.get("filename", "").split("/")[0] for f in files if "/" in f.get("filename", "")})
    blast_radius = BlastRadiusInfo(
        summary=f"{len(files)} files changed across {max(1, len(touched_dirs))} modules",
        modules=touched_dirs[:6] if touched_dirs else ["root-package"]
    )

    return pr_meta, risk_assessment, findings, recommendations, blast_radius

