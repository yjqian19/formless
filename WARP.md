# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository status
- This repo currently contains architecture documentation only (see README.md). No build scripts, manifests, or tests are present yet. As code is added, update the Commands section below with the actual tooling.
- No CLAUDE, Cursor, or Copilot rules were found.

Commands (to be updated as code lands)
Because there are no manifests or scripts checked in yet, there are no authoritative build/lint/test commands. Use the following discovery steps and command templates once the corresponding components are added.

Backend (FastAPI + PostgreSQL)
- Discover:
  - Look for backend/ or api/ containing Python files, a pyproject.toml or requirements.txt.
  - If pytest.ini, pyproject.toml [tool.pytest], or tests/ exist, pytest is likely in use.
  - If ruff.toml/pyproject [tool.ruff] or .flake8 exist, a linter is configured.
- Run dev server (when an app exists):
  - uvicorn backend.main:app --reload --port 8000
    - Adjust module path to the actual ASGI app (e.g., src.app:app).
- Tests (pytest typical):
  - Run all: pytest -q
  - Single test file: pytest -q path/to/test_file.py
  - Single test node: pytest -q path/to/test_file.py::TestClass::test_case
- Lint/format (when configured):
  - Ruff: ruff check .
  - Black: black .
- Database (local PostgreSQL; replace placeholders as needed):
  - docker run --name formless-postgres -e POSTGRES_USER=${POSTGRES_USER:-formless} -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-formless} -e POSTGRES_DB=${POSTGRES_DB:-formless} -p 5432:5432 -d postgres:16

Chrome Extension (Manifest V3)
- Discover:
  - Look for extension/ with manifest.json and a package.json if a build pipeline exists.
- Build (if Node toolchain is added):
  - npm run build or pnpm build (check package.json scripts)
- Load for manual testing:
  - Chrome → chrome://extensions → Enable Developer mode → Load unpacked → select the built or source extension directory.

Frontend (Memory Hub UI)
- Discover:
  - Look for frontend/ or web/ with package.json and a Vite/Next/CRA config.
- Typical commands (if Node toolchain is added):
  - Install deps: npm ci or pnpm install
  - Dev server: npm run dev
  - Tests: npm test (Jest/Vitest), single test often via: npm test -- path/to/spec or vitest path/to/spec -t "name"
  - Lint: npm run lint (ESLint)

High-level architecture (from README)
- Components
  - Frontend (Memory Hub): UI to manage "Memory" data.
  - Chrome Extension: Parses page form fields, calls backend to match values, and auto-fills forms.
  - Backend (FastAPI + PostgreSQL): Stores Memory data and performs matching logic.
- Current status
  - Single-user operation.
  - Extension injects a Content Script.
  - Backend exposes APIs for Memory CRUD and matching.
- Data flow
  1) Frontend → Backend: Memory CRUD
  2) Extension → Backend: Matching request for parsed form fields
  3) Backend → Extension: Matching result
  4) Extension: Auto-fill form
- Extension modes
  - URL Auto-fill Mode (Background Script + chrome.storage):
    - Frontend opens tab → persists task in chrome.storage → Background listens for tab load → sends message to Content Script → Content Script auto-fills.
    - Advantages: non-invasive (no URL tampering), low latency, supports task state.
  - Playwright/Stagehand Mode (backend-driven automation coordinated via CrewAI):
    - Backend launches a new browser (not the user’s current one), executes filling, returns results (e.g., screenshots/status).
    - Suited for batch or non-interactive flows; cannot control the user’s current browser session.

Tech stack (from README)
- Frontend: HTML/CSS/JavaScript
- Extension: Chrome Extension Manifest V3
- Backend: FastAPI (Python)
- Database: PostgreSQL

What to do next (for maintainers)
- As you add each component, check in its manifest/config and update the Commands section with the exact dev/test/lint/run instructions (e.g., package.json scripts, Makefile targets, or Poetry/uv tools).