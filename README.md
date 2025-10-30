# Formless Architecture

## Current Architecture

```
Frontend (Formless Web Page)
    ↓
Extension (Chrome Extension)
    ↓
Backend (FastAPI + PostgreSQL)
```

### Components

- **Frontend**: Memory Hub management interface for managing Memory data
- **Extension**: Chrome extension that parses form fields, calls backend matching, and auto-fills forms
- **Backend**: FastAPI service + PostgreSQL database, stores Memory data and executes matching logic

### Current Status

- Single user operation (no multi-user support needed)
- Extension injects Content Script into pages
- Backend API handles Memory CRUD and form field matching

## Data Flow

```
User Operation Flow:
1. Frontend → Backend API: Memory CRUD
2. Extension → Parse form fields → Backend API: Matching request
3. Extension ← Matching result ← Backend API
4. Extension → Auto-fill form
```

## Extension Points

### 1. URL Auto-fill Mode

**Implementation**: Background Script + chrome.storage

**Flow**:
```
Frontend → chrome.tabs.create({ url })
        → chrome.storage.set({ task })
Background Script → Listen for tab load completion
                → Check storage for tasks
                → chrome.tabs.sendMessage() trigger Content Script
Content Script → Auto-execute fill
```

**Advantages**:
- No URL modification (avoids affecting websites)
- Real-time triggering with low latency
- Supports task state management

### 2. Playwright/Stagehand Mode

**Consideration**: Backend automation for form filling

**Limitations**:
- Playwright/Stagehand cannot control user's current browser
- Can only launch new browser processes (headless or visible mode)
- Users cannot interactively modify in the newly launched browser

**Use Cases**:
- Batch processing tasks
- Backend-controlled automation workflows
- Scenarios requiring no user interaction

**Implementation**:
```
Backend → CREWAI (coordinate AI Agents)
       → Playwright/Stagehand (launch new browser)
       → Execute form filling
       → Return results (screenshots/status)
```

## Tech Stack

- Frontend: HTML/CSS/JavaScript
- Extension: Chrome Extension Manifest V3
- Backend: FastAPI (Python)
- Database: PostgreSQL
