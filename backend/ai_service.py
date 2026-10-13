"""
PRism — AI Service
Optional AI-assisted PR analysis provider integration (OpenAI, Anthropic, Gemini, or generic LLM).
Fails gracefully with a clear informative message if no provider is configured or if API fails,
preserving deterministic heuristic triage output at all times.
"""

import os
import logging
from typing import Dict, Any, List, Optional, Tuple
import httpx
from backend.schemas import PullRequestMetadata, RiskAssessment, Finding, AiExplanation, BlastRadiusInfo

logger = logging.getLogger("prism.ai_service")

AI_REQUEST_TIMEOUT = 10.0


def get_configured_ai_provider() -> Tuple[str, Optional[str]]:
    """
    Detects which AI provider API key is present in environment variables.
    Returns (provider_name, api_key).
    """
    if os.getenv("OPENAI_API_KEY"):
        return "openai", os.getenv("OPENAI_API_KEY")
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic", os.getenv("ANTHROPIC_API_KEY")
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return "gemini", os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    return "none", None


def build_deterministic_ai_fallback(
    pr_meta: PullRequestMetadata,
    risk: RiskAssessment,
    findings: List[Finding],
    recommendations: List[str],
    blast_radius: BlastRadiusInfo,
    provider_status_note: str
) -> AiExplanation:
    """
    Constructs a deterministic, structured explanation when AI is unavailable or disabled.
    Ensures the UI and API response always remain complete and actionable.
    """
    top_findings = findings[:4]
    risk_drivers = [
        f"[{f.severity.upper()}] {f.title}: {f.description}" for f in top_findings
    ]
    if not risk_drivers:
        risk_drivers = ["No high-priority security or stability hazards identified."]

    exec_summary = (
        f"PR #{pr_meta.number} ('{pr_meta.title}') evaluated with risk score {risk.score}/100 ({risk.severity.upper()}). "
        f"Verdict: {risk.verdict}. {risk.summary} "
        f"[{provider_status_note}]"
    )

    checklist = list(recommendations) if recommendations else [
        "Verify automated CI/CD test suite passes completely.",
        "Review diff against base branch for backward compatibility."
    ]

    return AiExplanation(
        executive_summary=exec_summary,
        risk_drivers=risk_drivers,
        checklist=checklist,
        blast_radius=blast_radius
    )


async def call_openai_compatible(
    api_key: str,
    prompt: str,
    base_url: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini"
) -> str:
    """
    Calls OpenAI-compatible /chat/completions endpoint using httpx.
    """
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key.strip()}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": os.getenv("OPENAI_MODEL") or model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a senior AppSec and DevOps code reviewer. "
                    "Provide a concise, objective 2-3 sentence executive summary of the pull request risk."
                )
            },
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 250,
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=AI_REQUEST_TIMEOUT) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        else:
            raise RuntimeError(f"OpenAI API returned HTTP {response.status_code}: {response.text}")


async def generate_ai_explanation(
    pr_meta: PullRequestMetadata,
    risk: RiskAssessment,
    findings: List[Finding],
    recommendations: List[str],
    blast_radius: BlastRadiusInfo
) -> AiExplanation:
    """
    Attempts to generate an LLM-assisted summary if a provider is configured.
    Falls back gracefully if no provider is present or if network/API calls fail.
    """
    provider, api_key = get_configured_ai_provider()

    # 1. No provider configured
    if provider == "none" or not api_key:
        return build_deterministic_ai_fallback(
            pr_meta, risk, findings, recommendations, blast_radius,
            provider_status_note="AI summary unavailable: No LLM API key configured in environment. Using deterministic heuristic synthesis."
        )

    # 2. Provider configured: attempt LLM completion
    prompt = (
        f"Pull Request: #{pr_meta.number} {pr_meta.title}\n"
        f"Repository: {pr_meta.repo}\n"
        f"Diff: +{pr_meta.diff_stats.additions} / -{pr_meta.diff_stats.deletions} lines across {pr_meta.diff_stats.files_changed} files\n"
        f"Calculated Risk Score: {risk.score}/100 ({risk.severity})\n"
        f"Verdict: {risk.verdict}\n"
        f"Identified Findings:\n" +
        "\n".join([f"- [{f.severity}] {f.title}: {f.description}" for f in findings[:5]])
    )

    try:
        if provider == "openai":
            base_url = os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1"
            summary_text = await call_openai_compatible(api_key, prompt, base_url=base_url)
            
            risk_drivers = [f"[{f.severity.upper()}] {f.title}" for f in findings[:4]]
            return AiExplanation(
                executive_summary=summary_text,
                risk_drivers=risk_drivers if risk_drivers else ["Heuristic diff indicators verified."],
                checklist=recommendations,
                blast_radius=blast_radius
            )
        else:
            # Fallback for other providers until custom client is needed
            return build_deterministic_ai_fallback(
                pr_meta, risk, findings, recommendations, blast_radius,
                provider_status_note=f"AI provider '{provider}' configured. Using deterministic synthesis."
            )

    except Exception as exc:
        logger.warning(f"AI provider '{provider}' call failed: {exc}. Reverting to deterministic summary.")
        return build_deterministic_ai_fallback(
            pr_meta, risk, findings, recommendations, blast_radius,
            provider_status_note=f"AI provider call failed ({str(exc)[:60]}). Reverted to deterministic heuristic synthesis."
        )
