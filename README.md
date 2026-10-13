# PRISM
AI ASSISTED PR TRIAGE AND RISK ASSESSMENT 

## Overview
**PRism** is a developer platform for automated GitHub pull request risk classification, vulnerability heuristics, and evidence-backed triage. It features a premium dark developer-tool interface built with React, Vite, Tailwind CSS, and Lucide React.

---

## Quickstart

### 1. Prerequisites
- **Node.js**: v18+ (Node.js LTS v20+ recommended)
- **npm**: v9+

### 2. Running the Development Server
From the project directory:
```bash
npm install
npm run dev
```

The application runs at:
```
http://localhost:5173
```

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## Backend API Contract

The frontend connects to the triage engine via a dedicated client service (`src/services/api.js`).

### Request
- **Endpoint**: `POST /api/analyze`
- **Headers**: `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "url": "https://github.com/:owner/:repo/pull/:id"
  }
  ```

### Flexible Response Schema
The frontend defensively normalizes both `camelCase` and `snake_case` payloads:
```json
{
  "repository": "acme-corp/core-auth-service",
  "pr_number": 142,
  "title": "feat: add local dev auth bypass",
  "author": "dev-sam",
  "base_branch": "main",
  "head_branch": "feature/auth-patch",
  "risk_score": 94,
  "risk_level": "CRITICAL",
  "ai_summary": "Critical authentication bypass and SQL injection detected in PR diff.",
  "findings": [
    {
      "id": "crit-01",
      "title": "Unauthenticated JWT Verification Bypass",
      "severity": "CRITICAL",
      "file_path": "src/middleware/auth.js",
      "line_number": 42,
      "description": "Fallback condition bypasses signature verification.",
      "evidence": "@@ -40,6 +40,11 @@ exports.verifyToken = (req, res, next) => {\n+  if (req.query.skipAuth === '1') return next();",
      "recommendation": "Remove development bypass condition before merge."
    }
  ],
  "recommendations": [
    {
      "action": "BLOCK MERGE: Revert auth bypass in src/middleware/auth.js",
      "priority": "CRITICAL",
      "is_blocker": true
    }
  ],
  "changed_files": [
    {
      "filename": "src/middleware/auth.js",
      "status": "modified",
      "additions": 6,
      "deletions": 1,
      "is_sensitive": true
    }
  ]
}
```

---

## Environment Configuration

Configure `VITE_API_BASE_URL` in `.env` (or copy from `.env.example`):
```env
VITE_API_BASE_URL=http://localhost:8000
```
> **Security Note**: Never place API tokens, GitHub Personal Access Tokens (PAT), or private credentials in frontend `.env` files or browser code. Keep secrets exclusively in the backend server.

---

## Modes

1. **Live Backend Mode (Default)**: Submits real HTTP `POST /api/analyze` requests to the configured triage backend.
2. **Demo Mode**: Allows exploring pre-computed test vectors (Critical Risk, High Risk, Low Risk) for presentations, pitch decks, and offline testing without requiring a live backend. Toggle anytime via the **Demo Mode** switch in the top header.
