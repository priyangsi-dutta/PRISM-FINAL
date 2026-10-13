"""
PRism — Backend Test Suite
Includes unit tests, deterministic heuristic tests, failure condition tests, and public PR integration tests.
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.schemas import AnalyzeRequest
from backend.analyzer import analyze_pull_request
from backend.ai_service import get_configured_ai_provider, generate_ai_explanation


client = TestClient(app)


# ==============================================================================
# 1. URL Validation Tests
# ==============================================================================

def test_url_validation_valid():
    valid_urls = [
        "https://github.com/octocat/Hello-World/pull/1347",
        "https://github.com/facebook/react/pull/28000",
        "https://github.com/owner-name/repo_name.js/pull/42",
        "https://www.github.com/org/repo/pull/123/",
    ]
    for url in valid_urls:
        req = AnalyzeRequest(url=url)
        owner, repo, pr_num = req.parse_coordinates()
        assert owner is not None
        assert repo is not None
        assert pr_num > 0


def test_url_validation_rejections():
    invalid_urls = [
        "https://gitlab.com/owner/repo/pull/123",  # Non-GitHub host
        "https://bitbucket.org/owner/repo/pull/123",
        "https://github.com/owner/repo",  # Missing /pull/
        "https://github.com/owner/repo/issues/123",  # Issue, not PR
        "https://github.com/owner/repo/pull/0",  # Invalid PR 0
        "https://github.com/owner/repo/pull/-5",  # Negative PR number
        "https://github.com/owner/repo/pull/abc",  # Non-numeric PR number
        "not-a-url",
        "",
    ]
    for url in invalid_urls:
        with pytest.raises(ValueError):
            AnalyzeRequest(url=url)


# ==============================================================================
# 2. Heuristic Analyzer Tests (Local & Deterministic)
# ==============================================================================

def test_analyzer_empty_pr():
    raw_pr = {
        "title": "Empty bump",
        "number": 10,
        "state": "open",
        "additions": 0,
        "deletions": 0,
        "changed_files": 0,
        "user": {"login": "dev1"},
        "base": {"repo": {"full_name": "acme/repo"}}
    }
    files = []

    pr_meta, risk, findings, recs, blast = analyze_pull_request(raw_pr, files)
    assert risk.score == 0
    assert risk.severity == "low"
    assert any(f.category == "Empty PR" for f in findings)


def test_analyzer_massive_diff():
    raw_pr = {
        "title": "Giant monorepo rewrite",
        "number": 101,
        "state": "open",
        "additions": 4500,
        "deletions": 1200,
        "changed_files": 55,
        "user": {"login": "dev1"},
        "base": {"repo": {"full_name": "acme/monorepo"}}
    }
    files = [{"filename": f"src/file_{i}.ts", "patch": "+ line\n+ line2"} for i in range(55)]

    pr_meta, risk, findings, recs, blast = analyze_pull_request(raw_pr, files)
    assert risk.severity in ("critical", "high")
    assert risk.score >= 60
    assert any(f.category == "Diff Volume" for f in findings)


def test_analyzer_sensitive_files():
    raw_pr = {
        "title": "Update secrets & CI",
        "number": 88,
        "state": "open",
        "additions": 20,
        "deletions": 5,
        "changed_files": 2,
        "user": {"login": "dev1"},
        "base": {"repo": {"full_name": "acme/repo"}}
    }
    files = [
        {"filename": ".env.production", "patch": "+ DATABASE_URL=secret"},
        {"filename": ".github/workflows/deploy.yml", "patch": "+ run: echo deploy"}
    ]

    pr_meta, risk, findings, recs, blast = analyze_pull_request(raw_pr, files)
    assert risk.score >= 60
    assert any(f.category == "Sensitive File Modification" for f in findings)


def test_analyzer_suspicious_dependency():
    raw_pr = {
        "title": "Add helper lib",
        "number": 33,
        "state": "open",
        "additions": 5,
        "deletions": 0,
        "changed_files": 1,
        "user": {"login": "dev1"},
        "base": {"repo": {"full_name": "acme/repo"}}
    }
    files = [
        {"filename": "package.json", "patch": '@@ -10,1 +10,2 @@\n+ "reqeusts": "^2.31.0"'}
    ]

    pr_meta, risk, findings, recs, blast = analyze_pull_request(raw_pr, files)
    assert any(f.category == "Suspicious Dependency" for f in findings)


def test_analyzer_secret_leak():
    raw_pr = {
        "title": "Add auth config",
        "number": 44,
        "state": "open",
        "additions": 10,
        "deletions": 0,
        "changed_files": 1,
        "user": {"login": "dev1"},
        "base": {"repo": {"full_name": "acme/repo"}}
    }
    files = [
        {"filename": "config.ts", "patch": '@@ -1,1 +1,2 @@\n+ const key = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEA0"'}
    ]

    pr_meta, risk, findings, recs, blast = analyze_pull_request(raw_pr, files)
    assert risk.severity == "critical"
    assert any(f.category == "Exposed Secret / Key" for f in findings)


# ==============================================================================
# 3. AI Service Graceful Fallback Test
# ==============================================================================

@pytest.mark.asyncio
async def test_ai_service_fallback_without_keys():
    raw_pr = {
        "title": "Regular update",
        "number": 1,
        "state": "open",
        "additions": 10,
        "deletions": 2,
        "changed_files": 1,
        "user": {"login": "dev1"},
        "base": {"repo": {"full_name": "acme/repo"}}
    }
    files = [{"filename": "src/index.ts", "patch": "+ console.log('hello');"}]
    pr_meta, risk, findings, recs, blast = analyze_pull_request(raw_pr, files)

    # Force provider to none
    with patch("backend.ai_service.get_configured_ai_provider", return_value=("none", None)):
        ai_exp = await generate_ai_explanation(pr_meta, risk, findings, recs, blast)
        assert ai_exp.executive_summary is not None
        assert "AI summary unavailable" in ai_exp.executive_summary or "evaluated with risk score" in ai_exp.executive_summary
        assert len(ai_exp.checklist) > 0


# ==============================================================================
# 4. API Endpoints Tests
# ==============================================================================

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "PRism" in data["service"]


def test_api_analyze_rejects_bad_hosts():
    response = client.post("/api/analyze", json={"url": "https://attacker.com/evil/repo/pull/1"})
    assert response.status_code == 422 or response.status_code == 400


def test_api_analyze_with_mock_github():
    mock_pr = {
        "title": "feat: add user profile endpoint",
        "number": 55,
        "state": "open",
        "html_url": "https://github.com/mock-org/mock-repo/pull/55",
        "additions": 120,
        "deletions": 15,
        "changed_files": 3,
        "user": {"login": "johndoe", "name": "John Doe", "avatar_url": None},
        "head": {"ref": "feat/profile"},
        "base": {"ref": "main", "repo": {"full_name": "mock-org/mock-repo"}},
        "created_at": "2026-10-10T12:00:00Z",
        "labels": [{"name": "backend"}]
    }
    mock_files = [
        {"filename": "src/controllers/user.ts", "patch": "+ export class UserController {}", "additions": 60, "deletions": 5},
        {"filename": "src/models/user.ts", "patch": "+ interface User {}", "additions": 40, "deletions": 0},
        {"filename": "tests/user.test.ts", "patch": "+ it('works', () => {});", "additions": 20, "deletions": 10}
    ]

    with patch("backend.main.get_pull_request_full_data", new_callable=AsyncMock) as mock_get_pr:
        mock_get_pr.return_value = (mock_pr, mock_files)
        response = client.post("/api/analyze", json={"url": "https://github.com/mock-org/mock-repo/pull/55"})
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required user fields
        assert "pull_request" in data
        assert "risk_score" in data
        assert "risk_level" in data
        assert "findings" in data
        assert "ai_summary" in data
        assert "recommendations" in data
        assert "changed_files" in data
        assert len(data["changed_files"]) == 3

        # Verify frontend compatibility mirrors
        assert "metadata" in data
        assert "risk_assessment" in data
        assert "ai_explanation" in data
        assert data["pull_request"]["title"] == "feat: add user profile endpoint"
        assert data["risk_score"] >= 0


# ==============================================================================
# 5. Live Public Pull Request Test (Optional Integration)
# ==============================================================================

def test_live_public_pull_request():
    """
    Tests live GitHub API integration against a known public Pull Request:
    https://github.com/github/gitignore/pull/1
    Handles rate limits gracefully if unauthenticated quota is exceeded.
    """
    response = client.post("/api/analyze", json={"url": "https://github.com/github/gitignore/pull/1"})
    
    if response.status_code == 200:
        data = response.json()
        assert data["pull_request"]["number"] == 1
        assert "gitignore" in data["pull_request"]["repo"].lower()
        assert "risk_score" in data
        assert "findings" in data
        assert "metadata" in data
        assert "risk_assessment" in data
    elif response.status_code in (429, 403):
        # GitHub unauthenticated rate limit reached; verify clear rate limit reporting
        error_detail = response.json().get("detail", "")
        assert "rate limit" in error_detail.lower() or "denied" in error_detail.lower()
    else:
        # Should not return unexpected internal error
        assert response.status_code in (200, 429, 403)

