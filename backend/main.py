"""
PRism — AI GitHub PR Risk Triage Dashboard
FastAPI Application Entry Point
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Load environment variables from .env if present
load_dotenv()

from backend.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse
)
from backend.github_service import (
    get_pull_request_full_data,
    has_configured_token
)
from backend.analyzer import analyze_pull_request
from backend.ai_service import (
    generate_ai_explanation,
    get_configured_ai_provider
)

app = FastAPI(
    title="PRism — AI PR Risk Triage Engine",
    description="Automated risk scoring, security scanning, and blast radius estimation for GitHub Pull Requests.",
    version="1.0.0"
)

# Enable CORS for local development & preview servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# API Routes
# --------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint reporting API status and provider readiness.
    """
    provider_name, _ = get_configured_ai_provider()
    return HealthResponse(
        status="ok",
        service="PRism Triage Backend",
        version="1.0.0",
        ai_provider=provider_name,
        ai_available=(provider_name != "none"),
        github_auth_configured=has_configured_token()
    )


@app.post("/api/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
async def analyze_pull_request_endpoint(request: AnalyzeRequest):
    """
    Analyzes a GitHub Pull Request URL.
    - Validates owner, repository, and pull number.
    - Fetches real metadata and unified diff patches from GitHub REST API.
    - Executes deterministic heuristic risk analysis.
    - Attaches optional AI explanation with graceful fallback.
    - Returns structured triage report.
    """
    try:
        owner, repo, pull_number = request.parse_coordinates()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Pull Request URL: {str(exc)}"
        )

    # 1. Fetch GitHub data (metadata + changed files)
    raw_pr, raw_files = await get_pull_request_full_data(owner, repo, pull_number)

    # 2. Run deterministic heuristic risk engine
    pr_meta, risk_assessment, findings, recommendations, blast_radius = analyze_pull_request(
        raw_pr, raw_files
    )

    # 3. Generate AI explanation (or deterministic fallback if AI is disabled/unavailable)
    ai_explanation = await generate_ai_explanation(
        pr_meta, risk_assessment, findings, recommendations, blast_radius
    )

    # 4. Construct complete response meeting all user & frontend specifications
    return AnalyzeResponse(
        pull_request=pr_meta,
        risk_score=risk_assessment.score,
        risk_level=risk_assessment.severity,
        findings=findings,
        ai_summary=ai_explanation.executive_summary,
        recommendations=recommendations,
        changed_files=raw_files,
        # Mirrors for existing frontend components
        metadata=pr_meta,
        risk_assessment=risk_assessment,
        ai_explanation=ai_explanation
    )


# --------------------------------------------------------------------------
# Static Files & Frontend Serving
# --------------------------------------------------------------------------

def resolve_frontend_directory() -> Path:
    """
    Finds the frontend directory whether app is run from project root or backend folder.
    """
    base_dir = Path(__file__).resolve().parent.parent

    # 0. Production Vite build (dist)
    candidate_dist = base_dir / "dist"
    if candidate_dist.exists() and (candidate_dist / "index.html").exists():
        return candidate_dist

    # 1. Direct parent/frontend
    candidate_1 = base_dir / "frontend"
    if candidate_1.exists() and (candidate_1 / "index.html").exists():
        return candidate_1

    # 2. Local sibling frontend
    candidate_2 = Path(__file__).resolve().parent / "frontend"
    if candidate_2.exists() and (candidate_2 / "index.html").exists():
        return candidate_2

    # 3. Subdirectory PRISM/frontend
    candidate_3 = base_dir / "PRISM" / "frontend"
    if candidate_3.exists() and (candidate_3 / "index.html").exists():
        return candidate_3

    # Fallback to current working directory
    return Path.cwd() / "frontend"

frontend_path = resolve_frontend_directory()

if frontend_path.exists():
    @app.get("/", include_in_schema=False)
    async def serve_index():
        index_file = frontend_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="index.html not found")

    # Mount static assets at root (FastAPI matches explicit /api/* routes before static files)
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

