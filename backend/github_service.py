"""
PRism — GitHub Service
Interacts with GitHub REST API v3 to retrieve Pull Request metadata and file diffs.
Handles authentication, rate limits, pagination, timeouts, and diff size constraints.
"""

import os
from typing import Dict, Any, List, Tuple
import httpx
from fastapi import HTTPException


# Safe limits to prevent DoS / unbounded memory consumption
MAX_FILES_PROCESSED = 100
MAX_PATCH_LENGTH_PER_FILE = 8_000  # characters
MAX_TOTAL_PATCH_LENGTH = 80_000   # characters
REQUEST_TIMEOUT_SECONDS = 15.0


def get_github_headers() -> Dict[str, str]:
    """
    Builds HTTP headers for GitHub REST API requests.
    Loads personal access token from GITHUB_TOKEN or GH_TOKEN environment variable.
    """
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "PRism-Triage-Engine/1.0"
    }
    if token and token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"
    return headers


def has_configured_token() -> bool:
    """
    Checks if a GitHub token is configured in the environment.
    """
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    return bool(token and token.strip())


async def fetch_pull_request_metadata(
    client: httpx.AsyncClient, owner: str, repo: str, pull_number: int
) -> Dict[str, Any]:
    """
    Retrieves PR details from GET /repos/{owner}/{repo}/pulls/{number}.
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}"
    headers = get_github_headers()

    try:
        response = await client.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=f"Connection to GitHub API timed out after {REQUEST_TIMEOUT_SECONDS}s."
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Network error connecting to GitHub: {str(exc)}"
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Pull request #{pull_number} not found in repository '{owner}/{repo}'. "
                "Check the repository name or provide a valid GITHUB_TOKEN in .env if it is private."
            )
        )
    elif response.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="GitHub API authentication failed. Verify your GITHUB_TOKEN in the environment."
        )
    elif response.status_code in (403, 429):
        # Check rate limit header
        rate_remaining = response.headers.get("x-ratelimit-remaining")
        reset_time = response.headers.get("x-ratelimit-reset")
        if rate_remaining == "0":
            detail_msg = "GitHub API rate limit exceeded."
            if not has_configured_token():
                detail_msg += (
                    " Unauthenticated requests are limited to 60/hr. "
                    "Configure GITHUB_TOKEN in .env to receive 5,000 requests/hr."
                )
            raise HTTPException(status_code=429, detail=detail_msg)
        raise HTTPException(
            status_code=response.status_code,
            detail=f"GitHub API access denied: {response.text}"
        )
    elif response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"GitHub API returned unexpected HTTP {response.status_code}: {response.text}"
        )

    try:
        return response.json()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Malformed JSON response received from GitHub API: {str(exc)}"
        )


async def fetch_pull_request_files(
    client: httpx.AsyncClient, owner: str, repo: str, pull_number: int
) -> List[Dict[str, Any]]:
    """
    Retrieves changed files from GET /repos/{owner}/{repo}/pulls/{number}/files.
    Handles pagination up to MAX_FILES_PROCESSED and truncates long patch diffs.
    """
    headers = get_github_headers()
    files_list: List[Dict[str, Any]] = []
    page = 1
    per_page = 100
    total_patch_chars = 0

    while len(files_list) < MAX_FILES_PROCESSED:
        url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pull_number}/files?page={page}&per_page={per_page}"
        try:
            response = await client.get(url, headers=headers, timeout=REQUEST_TIMEOUT_SECONDS)
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail=f"Timed out fetching PR files on page {page}."
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Network error fetching files from GitHub: {str(exc)}"
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch PR changed files (HTTP {response.status_code}): {response.text}"
            )

        page_files = response.json()
        if not page_files or not isinstance(page_files, list):
            break

        for item in page_files:
            if len(files_list) >= MAX_FILES_PROCESSED:
                break

            filename = item.get("filename", "")
            raw_patch = item.get("patch", "")

            # Truncate patch if it exceeds per-file or total limit
            patch_text = raw_patch or ""
            if len(patch_text) > MAX_PATCH_LENGTH_PER_FILE:
                patch_text = (
                    patch_text[:MAX_PATCH_LENGTH_PER_FILE]
                    + "\n... [diff truncated by PRism for performance]"
                )

            total_patch_chars += len(patch_text)
            if total_patch_chars > MAX_TOTAL_PATCH_LENGTH:
                patch_text = "[diff omitted: cumulative PR diff limit reached]"

            files_list.append({
                "filename": filename,
                "status": item.get("status", "modified"),
                "additions": item.get("additions", 0),
                "deletions": item.get("deletions", 0),
                "changes": item.get("changes", 0),
                "patch": patch_text,
                "raw_url": item.get("raw_url", "")
            })

        # If page returned fewer items than requested, we've reached the last page
        if len(page_files) < per_page:
            break

        page += 1

    return files_list


async def get_pull_request_full_data(
    owner: str, repo: str, pull_number: int
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    High-level aggregator: retrieves both PR metadata and changed files using an async HTTP client.
    """
    async with httpx.AsyncClient() as client:
        metadata = await fetch_pull_request_metadata(client, owner, repo, pull_number)
        files = await fetch_pull_request_files(client, owner, repo, pull_number)
        return metadata, files

