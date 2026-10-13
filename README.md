# 🛡️ PRism — AI-Assisted GitHub Pull Request Risk Triage Platform

PRism is an intelligent, developer-first platform designed to evaluate, score, and triage risk across GitHub Pull Requests. By combining deterministic heuristic static analysis (diff volume, sensitive path modifications, dependency typosquatting, credential exposure) with optional AI explanations (OpenAI, Anthropic, Gemini), PRism gives engineering teams actionable merge intelligence and blast radius visibility before merging code into production.

---

## 🏗️ Architecture

PRism is built as a modular full-stack application:

- **Frontend (`src/` & `index.html`)**:
  - React 18 & JavaScript (ES Modules).
  - Bundled with **Vite** for fast HMR and optimized builds.
  - Styled with **Tailwind CSS** featuring a dark developer aesthetic (deep navy & charcoal with electric-blue accents).
  - Icons by **Lucide React**.
  - Interactive triage workspace: live PR input, pre-computed demo vectors, risk distribution metrics, findings explorer with diff snippets, and one-click Markdown review generation.
- **Backend (`backend/`)**:
  - **FastAPI** & **Uvicorn** async web service.
  - **HTTPX** client interacting with the GitHub REST API v3.
  - **Pydantic v2** strict request/response data contracts and URL validation.
  - **Deterministic Heuristic Risk Engine (`backend/analyzer.py`)**: calculates risk scores (0–100), severity tiers (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), actionable verdicts (`BLOCK MERGE`, `REQUIRES STAGING SOAK`, `MANUAL REVIEW RECOMMENDED`, `SAFE TO MERGE`), and blast radius estimates.
  - **AI Service (`backend/ai_service.py`)**: optional provider integration with automatic graceful fallback to deterministic synthesis when no API key is configured.
- **Testing Suite (`tests/`)**:
  - Automated tests using **pytest**, **pytest-asyncio**, and FastAPI's **TestClient**.

---

## 📋 Prerequisites

Before running PRism locally, ensure you have the following installed:

1. **Python**: Python 3.10 or later (tested on Python 3.12).
2. **Node.js & npm**: Node.js v18+ (Node.js LTS v20+ recommended) and npm v9+ (for running the React/Vite development server or building the production UI).
3. **Git**: Git 2.30+ installed and configured on your system.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ghoshsoumya-ops/PRISM.git
cd PRISM
```

### 2. Environment Configuration

Copy the example environment configuration file:

```bash
cp .env.example .env
```
*(On Windows PowerShell, use: `Copy-Item .env.example .env`)*

Configure your `.env` variables as needed:
```env
# Frontend API Base URL (leave default if using Vite proxy)
VITE_API_BASE_URL=http://localhost:8000

# Optional: GitHub Personal Access Token (increases rate limit from 60 to 5,000 req/hr)
GITHUB_TOKEN=

# Optional: AI Provider (PRism works 100% deterministically without these)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
# ANTHROPIC_API_KEY=
# GEMINI_API_KEY=
```

---

### 3. Backend Setup & Startup

From the project root:

1. **Create and activate a virtual environment**:
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```

2. **Install Python dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Start the FastAPI backend**:
   ```bash
   uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```

The backend API will be available at `http://127.0.0.1:8000`. You can explore interactive Swagger documentation at `http://127.0.0.1:8000/docs`.

---

### 4. Frontend Setup & Startup

Open a separate terminal in the project root:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the Vite development server**:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

The Vite development server automatically proxies `/api` calls to `http://localhost:8000`.

---

### 5. Production Build

To build the React frontend for production deployment:

```bash
npm run build
```

This compiles static assets into the `dist/` directory. The FastAPI backend is configured to automatically serve static assets from `dist/` when present.

---

## 🧪 Running Tests

Run the complete backend test suite:

```bash
pytest tests/ -v
```

The test suite validates:
- Strict GitHub Pull Request URL validation and malformed URL rejection.
- Deterministic heuristic risk scoring (empty PRs, large diffs, sensitive paths, typosquatting packages, exposed secrets).
- AI provider graceful fallback without API keys.
- API endpoints (`GET /api/health`, `POST /api/analyze`) with mocked GitHub responses.
- Live public GitHub Pull Request analysis and rate limit handling.

---

## 🔌 API Endpoints & Request Formats

### 1. Health Check
- **Endpoint**: `GET /api/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "PRism Triage Backend",
    "version": "1.0.0",
    "ai_provider": "none",
    "ai_available": false,
    "github_auth_configured": false
  }
  ```

### 2. Analyze Pull Request
- **Endpoint**: `POST /api/analyze`
- **Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "url": "https://github.com/octocat/Hello-World/pull/1347"
  }
  ```
- **Response Structure**:
  ```json
  {
    "pull_request": {
      "title": "Fix memory leak in buffer pool",
      "number": 1347,
      "repo": "octocat/Hello-World",
      "html_url": "https://github.com/octocat/Hello-World/pull/1347",
      "state": "OPEN",
      "head_branch": "fix/buffer-leak",
      "base_branch": "main",
      "author": { "name": "octocat", "login": "octocat", "avatar_url": "..." },
      "diff_stats": { "additions": 45, "deletions": 12, "files_changed": 3 },
      "created_at": "2026-10-10T12:00:00Z"
    },
    "risk_score": 15,
    "risk_level": "low",
    "findings": [ ... ],
    "ai_summary": "PR #1347 evaluated with risk score 15/100 (LOW). Verdict: SAFE TO MERGE.",
    "recommendations": [ ... ],
    "changed_files": [ ... ],
    "metadata": { ... },
    "risk_assessment": { ... },
    "ai_explanation": { ... }
  }
  ```

---

## 🔒 Security Best Practices

- **Never Commit Secrets**: Never commit `.env` files, GitHub Personal Access Tokens, OpenAI/Anthropic/Gemini API keys, or private keys. The repository `.gitignore` is configured to prevent committing environment and credential files.
- **Client-Side Safety**: Browser code interacts only with `POST /api/analyze`. No GitHub tokens or AI keys are ever exposed or accessible to client-side bundles.
- **GitHub Token Scope**: If using `GITHUB_TOKEN`, use fine-grained tokens with read-only access to Pull Requests and Contents.

---

## 🛠️ Troubleshooting

- **429 Rate Limit Exceeded**: Unauthenticated requests to GitHub's REST API are limited to 60 per hour per IP. Add a `GITHUB_TOKEN=your_token` in `.env` to raise the limit to 5,000 requests/hour.
- **Unable to reach backend**: Ensure the Uvicorn server is running on `http://127.0.0.1:8000`. You can also switch to **Demo Mode** in the frontend header to explore simulated PR vectors offline.
- **ModuleNotFoundError in Python**: Verify your virtual environment is activated and run `pip install -r backend/requirements.txt`.

