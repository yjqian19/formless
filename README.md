# Formless Architecture

## Use Cases
#### Job Application Form
- Why do you want to work at Baseten? (https://jobs.ashbyhq.com/baseten/fc6e5f2e-eb2d-4a6c-8a51-8422e8662bde/application)
- Why are you interested in working at Suno?
- Describe your coolest project

#### Google Forms (Event Registration)
- Reality Hack is a fast-paced event that harnesses a variety of talents from participants to create something entirely new in a very short period of time. How do you envision your role in this environment and how will you contribute to your team?
- Can you demonstrate familiarity with any tools related to design, development, or programming languages for XR?
- (Availability?)

#### Online Quiz
-

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
