"""
PRism — AI Pull Request Risk Triage Dashboard
Pydantic Schemas for Request Validation and Response Serialization
"""

import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class AnalyzeRequest(BaseModel):
    """
    Request payload for pull request risk analysis.
    Accepts only valid GitHub PR URLs in format:
    https://github.com/{owner}/{repo}/pull/{number}
    """
    url: str = Field(..., description="Full GitHub Pull Request URL")

    @field_validator("url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("URL must be a non-empty string.")
        
        cleaned = v.strip()
        
        # Regex matching strict GitHub PR URL format
        # Disallow malicious scheme, non-github hosts, or unexpected trailing segments
        pattern = r"^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/([1-9][0-9]*)(?:\/.*)?$"
        match = re.match(pattern, cleaned)
        if not match:
            raise ValueError(
                "Invalid GitHub Pull Request URL. Expected format: https://github.com/{owner}/{repo}/pull/{number}"
            )
        
        owner, repo, pr_number = match.groups()
        
        # Guard against directory traversal or reserved names
        if owner in (".", "..") or repo in (".", ".."):
            raise ValueError("Invalid owner or repository name in URL.")
            
        return cleaned

    def parse_coordinates(self) -> tuple[str, str, int]:
        """
        Extracts (owner, repo, pull_number) from the validated URL.
        """
        pattern = r"^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/([1-9][0-9]*)"
        match = re.match(pattern, self.url.strip())
        if not match:
            raise ValueError("Malformed URL")
        owner, repo, number_str = match.groups()
        return owner, repo, int(number_str)


class AuthorInfo(BaseModel):
    name: Optional[str] = "Contributor"
    login: str = "unknown"
    initials: str = "PR"
    avatar_url: Optional[str] = None


class DiffStats(BaseModel):
    additions: int = 0
    deletions: int = 0
    files_changed: int = 0


class PullRequestMetadata(BaseModel):
    title: str
    number: int
    repo: str
    html_url: str
    state: str = "OPEN"
    head_branch: str = "feature"
    base_branch: str = "main"
    author: AuthorInfo
    diff_stats: DiffStats
    created_at: str
    updated_at: Optional[str] = None
    labels: List[str] = Field(default_factory=list)


class RiskBreakdown(BaseModel):
    security: int = Field(ge=0, le=100, default=0)
    blast_radius: int = Field(ge=0, le=100, default=0)
    drift: int = Field(ge=0, le=100, default=0)
    test_deficit: int = Field(ge=0, le=100, default=0)


class RiskAssessment(BaseModel):
    score: int = Field(ge=0, le=100)
    severity: str  # critical, high, medium, low
    verdict: str  # BLOCK MERGE, REQUIRES STAGING SOAK, MANUAL REVIEW RECOMMENDED, SAFE TO MERGE
    verdict_class: str  # chip-block, chip-caution, chip-pass
    summary: str
    confidence: str = "95%"
    breakdown: RiskBreakdown


class BlastRadiusInfo(BaseModel):
    summary: str
    modules: List[str] = Field(default_factory=list)


class AiExplanation(BaseModel):
    executive_summary: str
    risk_drivers: List[str] = Field(default_factory=list)
    checklist: List[str] = Field(default_factory=list)
    blast_radius: BlastRadiusInfo


class Finding(BaseModel):
    id: str
    severity: str  # critical, high, medium, low, info
    category: str
    title: str
    description: str
    affected_files: List[str] = Field(default_factory=list)
    evidence_diff: Optional[str] = None
    remediation: Optional[str] = None


class AnalyzeResponse(BaseModel):
    """
    Structured output returned by POST /api/analyze.
    Meets user specification (pull_request, risk_score, risk_level, findings, ai_summary, recommendations)
    and provides mirrors for existing frontend components.
    """
    pull_request: PullRequestMetadata
    risk_score: int
    risk_level: str
    findings: List[Finding]
    ai_summary: str
    recommendations: List[str]
    changed_files: Optional[List[Dict[str, Any]]] = None

    # Frontend-compatible aliases/mirrors
    metadata: PullRequestMetadata
    risk_assessment: RiskAssessment
    ai_explanation: AiExplanation


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "PRism Triage Backend"
    version: str = "1.0.0"
    ai_provider: str = "none"
    ai_available: bool = False
    github_auth_configured: bool = False

