---
title: "Refactor: Repository Structure Cleanup"
type: refactor
date: 2026-01-27
---

# Refactor: Repository Structure Cleanup

## Overview

Transform the current monolithic repository structure into a well-organized, modular codebase that enables easier maintenance, faster development, and clearer separation of concerns. The restructuring addresses three monolithic files totaling 18,800+ lines and 57 files scattered at root.

## Problem Statement

The repository has grown organically, resulting in:

| Problem | Impact |
|---------|--------|
| **app.js** (6,757 lines) | All frontend logic in one file - auth, agents, payments, analytics |
| **style.css** (9,522 lines) | All styles in one file - impossible to find relevant sections |
| **main.py** (2,527 lines) | All backend logic in one file - routes, services, utilities mixed |
| **29 markdown files at root** | Documentation sprawl - no organization, duplicates |
| **57 total files at root** | Code, config, docs, utilities all mixed together |
| **No module boundaries** | Changes risk cascading bugs, difficult onboarding |

### Current State Analysis

```
HealthcareAgentic/
├── public/                          # Frontend
│   ├── app.js          (6,757 lines - ALL logic)
│   ├── style.css       (9,522 lines - ALL styles)
│   ├── index.html      (2,270 lines - SPA shell)
│   └── resources/      (Generated articles)
├── document_analysis_function/      # Cloud Function (OK)
│   └── main.py
├── main.py             (2,527 lines - ALL backend)
├── [29 .md files]                   # Doc sprawl
├── [6 Python files]                 # Mixed utilities
├── [3 JS test files]                # No test framework
├── [2 shell scripts]                # Deployment
└── [config files]                   # Mixed with code
```

## Proposed Solution

### Target Structure

```
HealthcareAgentic/
├── public/                          # Frontend (Firebase Hosting)
│   ├── index.html
│   ├── js/                          # Modular JavaScript
│   │   ├── main.js                  # Entry point, imports modules
│   │   ├── config.js                # Firebase config, constants
│   │   ├── auth.js                  # Authentication logic
│   │   ├── agents/                  # Agent-specific modules
│   │   │   ├── ava.js               # Agent 1 - Quick Q&A
│   │   │   ├── sam.js               # Agent 2 - Bill Analysis
│   │   │   ├── riley.js             # Agent 3 - Disputes
│   │   │   └── john.js              # Agent 4 - Appeals
│   │   ├── payments.js              # Stripe integration
│   │   ├── analytics.js             # Tracking, metrics
│   │   ├── ui/                      # UI components
│   │   │   ├── navigation.js        # Team Tabs, routing
│   │   │   ├── modals.js            # Modal management
│   │   │   └── notifications.js     # Toast, alerts
│   │   └── globals.js               # Window.* exports for HTML onclick
│   ├── css/                         # Modular CSS
│   │   ├── main.css                 # Entry point, imports partials
│   │   ├── variables.css            # CSS custom properties
│   │   ├── base.css                 # Reset, typography
│   │   ├── layout.css               # Grid, containers
│   │   ├── navigation.css           # Team Tabs, menus
│   │   ├── agents.css               # Agent-specific styles
│   │   ├── forms.css                # Inputs, buttons
│   │   └── modals.css               # Modal, overlay styles
│   ├── img/                         # (unchanged)
│   └── resources/                   # (unchanged)
├── backend/                         # Python backend (Cloud Run)
│   ├── app.py                       # Flask app entry point
│   ├── routes/                      # API route handlers
│   │   ├── __init__.py
│   │   ├── agents.py                # /api/agent/* endpoints
│   │   ├── disputes.py              # /api/dispute/* endpoints
│   │   └── payments.py              # Stripe webhooks, checkout
│   ├── services/                    # Business logic
│   │   ├── __init__.py
│   │   ├── document_analyzer.py     # VertexAI analysis
│   │   ├── letter_generator.py      # Dispute letters
│   │   └── subscription.py          # Subscription management
│   └── requirements.txt
├── document_analysis_function/      # Cloud Function (unchanged)
│   └── main.py
├── scripts/                         # Deployment & utilities
│   ├── deploy-cloud-function.sh
│   ├── deploy-security-rules.sh
│   └── generate-articles.py
├── tests/                           # Test files
│   ├── browser/                     # Browser console scripts
│   │   ├── test_comprehensive_fix.js
│   │   ├── test_payment_flow.js
│   │   └── test_subscription_fix.js
│   └── README.md                    # Testing instructions
├── docs/                            # Documentation
│   ├── README.md                    # Overview
│   ├── architecture.md              # System design
│   ├── deployment.md                # Deploy procedures
│   ├── stripe-setup.md              # Payment integration
│   └── archive/                     # Historical docs
│       ├── fix-reports/             # *_FIX.md files
│       └── implementation/          # Implementation docs
├── CLAUDE.md                        # (updated with new paths)
├── README.md                        # (project overview)
├── firebase.json                    # (unchanged)
├── firestore.rules                  # (unchanged)
├── firestore.indexes.json           # (unchanged)
├── package.json                     # (updated script paths)
├── Dockerfile                       # (updated for backend/)
└── .env                             # (unchanged)
```

## Technical Approach

### Architecture Decision: Native ES6 Modules

Since the frontend uses Firebase SDK via CDN with no build step, use native ES6 modules:

```html
<!-- index.html -->
<script type="module" src="/js/main.js"></script>
```

```javascript
// public/js/main.js - Entry point
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { config } from './config.js';
import { initAuth } from './auth.js';
import { initNavigation } from './ui/navigation.js';
import './globals.js';  // Register window.* functions

const app = initializeApp(config.firebase);
initAuth(app);
initNavigation();
```

### Implementation Phases

#### Phase 1: Directory Structure & Documentation

**Deliverables:**
- Create `/docs/`, `/scripts/`, `/tests/`, `/backend/` directories
- Move all 29 .md files to `/docs/` with archive organization
- Move shell scripts to `/scripts/`
- Update `package.json` script paths
- Update `CLAUDE.md` with new structure

**Files to Create:**
- `/docs/README.md`
- `/docs/architecture.md`
- `/tests/README.md`

**Files to Move:**
```
# Documentation → /docs/ or /docs/archive/
QUICK_DEPLOYMENT_CHECKLIST.md → docs/deployment.md
STRIPE_SETUP.md → docs/stripe-setup.md
PLATFORM_DOCUMENTATION.md → docs/architecture.md
*_FIX.md, *_REPORT.md → docs/archive/fix-reports/
*_IMPLEMENTATION.md → docs/archive/implementation/

# Scripts → /scripts/
deploy-cloud-function.sh → scripts/
deploy-security-rules.sh → scripts/
generate_articles_advanced.py → scripts/generate-articles.py

# Tests → /tests/browser/
test_*.js → tests/browser/
```

**Success Criteria:**
- [ ] Root directory has < 20 files
- [ ] All deployment scripts work from new location
- [ ] `npm run` commands work with updated paths

---

#### Phase 2: CSS Modularization

**Deliverables:**
- Create `/public/css/` directory structure
- Split `style.css` into logical partials
- Use CSS `@import` for organization (no build step)
- Maintain visual parity with current design

**New CSS Files:**
```
public/css/
├── main.css        # @import statements only
├── variables.css   # :root { --color-*, --spacing-*, etc }
├── base.css        # Reset, typography, body styles (~500 lines)
├── layout.css      # Grid, containers, responsive (~800 lines)
├── navigation.css  # Team Tabs, sidebar, menus (~1200 lines)
├── agents.css      # Agent cards, chat, analysis (~2000 lines)
├── forms.css       # Inputs, buttons, selects (~1500 lines)
├── modals.css      # Modal overlays, dialogs (~1000 lines)
└── utilities.css   # Helpers, animations (~500 lines)
```

**main.css structure:**
```css
/* public/css/main.css */
@import 'variables.css';
@import 'base.css';
@import 'layout.css';
@import 'navigation.css';
@import 'agents.css';
@import 'forms.css';
@import 'modals.css';
@import 'utilities.css';
```

**index.html update:**
```html
<!-- Before -->
<link rel="stylesheet" href="style.css">

<!-- After -->
<link rel="stylesheet" href="css/main.css">
```

**Success Criteria:**
- [ ] All pages render identically (visual diff)
- [ ] No CSS console errors
- [ ] Mobile responsive layouts preserved
- [ ] Dark theme intact

---

#### Phase 3: Frontend JavaScript Modularization

**Deliverables:**
- Create `/public/js/` directory structure
- Split `app.js` into ES6 modules
- Preserve all window.* global functions for HTML onclick handlers
- Maintain full functionality across all agents

**New JS Files:**
```
public/js/
├── main.js              # App initialization, imports all modules
├── config.js            # Firebase config, API URLs, constants
├── auth.js              # Authentication (sign in, sign up, OAuth)
├── user.js              # User profile, subscription status
├── agents/
│   ├── index.js         # Common agent utilities
│   ├── ava.js           # Agent 1: Quick Q&A
│   ├── sam.js           # Agent 2: Bill Analysis
│   ├── riley.js         # Agent 3: Disputes
│   └── john.js          # Agent 4: Appeals
├── payments.js          # Stripe checkout, subscription
├── analytics.js         # Usage tracking, metrics
├── ui/
│   ├── navigation.js    # Team Tabs, routing, page switching
│   ├── modals.js        # Modal show/hide, modal stack
│   └── notifications.js # Toast messages, alerts
└── globals.js           # Window.* exports for HTML onclick
```

**globals.js pattern:**
```javascript
// public/js/globals.js - Makes functions available to onclick handlers
import { showDisputeDashboard, submitDispute } from './agents/riley.js';
import { showModal, hideModal } from './ui/modals.js';
import { showAppPage, showLandingPage } from './ui/navigation.js';

// Register all onclick-callable functions
window.showDisputeDashboard = showDisputeDashboard;
window.submitDispute = submitDispute;
window.showModal = showModal;
window.hideModal = hideModal;
window.showAppPage = showAppPage;
window.showLandingPage = showLandingPage;
// ... (40+ more functions)
```

**Critical: Preserve Global State**
```javascript
// public/js/config.js
export const firebaseConfig = { /* ... */ };
export const BACKEND_URL = 'https://backend-...run.app';
export const PRICE_IDS = { /* ... */ };
export const DISPUTE_STATUS_FLOW = [ /* ... */ ];

// Shared state (managed in main.js)
export let currentUser = null;
export let userSubscription = null;
```

**Success Criteria:**
- [ ] All 4 agents function correctly (Ava, Sam, Riley, John)
- [ ] Authentication works (email, Google OAuth)
- [ ] Payment flow completes
- [ ] All onclick handlers work
- [ ] No console errors
- [ ] Page load time within 500ms of current

---

#### Phase 4: Backend Modularization

**Deliverables:**
- Create `/backend/` directory structure
- Split `main.py` into routes and services
- Update Dockerfile and deployment
- Preserve all API endpoint URLs

**New Backend Files:**
```
backend/
├── app.py                    # Flask app entry, CORS, middleware
├── routes/
│   ├── __init__.py           # Blueprint registration
│   ├── agents.py             # /ask-agent1, /api/document-qa
│   ├── disputes.py           # /api/dispute/*
│   └── payments.py           # /create-checkout-session, webhooks
├── services/
│   ├── __init__.py
│   ├── document_analyzer.py  # VertexAI document analysis
│   ├── letter_generator.py   # Dispute letter generation
│   └── subscription.py       # Subscription validation
└── requirements.txt
```

**app.py structure:**
```python
# backend/app.py
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
from routes import agents, disputes, payments
app.register_blueprint(agents.bp)
app.register_blueprint(disputes.bp)
app.register_blueprint(payments.bp)

if __name__ == '__main__':
    app.run(debug=True, port=8080)
```

**Dockerfile update:**
```dockerfile
WORKDIR /app
COPY backend/ ./
COPY .env ./
CMD exec gunicorn --bind :$PORT app:app
```

**Success Criteria:**
- [ ] All API endpoints respond correctly
- [ ] Stripe webhooks process successfully
- [ ] Cloud Run deployment succeeds
- [ ] No breaking changes to frontend API calls

---

#### Phase 5: Verification & Cleanup

**Deliverables:**
- Remove deprecated files (old app.js, style.css, main.py backups)
- Update CLAUDE.md with final structure
- Run all test scripts
- Monitor production for 24 hours

**Final CLAUDE.md Structure Section:**
```markdown
## Architecture

### Frontend (public/)
- **js/main.js** - Entry point, imports all modules
- **js/auth.js** - Authentication (Firebase Auth)
- **js/agents/** - Agent-specific modules (ava, sam, riley, john)
- **js/payments.js** - Stripe integration
- **css/main.css** - CSS entry point with @imports

### Backend (backend/)
- **app.py** - Flask application entry point
- **routes/** - API endpoint handlers
- **services/** - Business logic modules

### Cloud Function (document_analysis_function/)
- **main.py** - Document AI + VertexAI analysis (unchanged)
```

## Acceptance Criteria

### Functional Requirements
- [ ] All authentication methods work (email, Google OAuth)
- [ ] All 4 agents function correctly
- [ ] Bill upload and analysis completes
- [ ] Dispute letter generation works
- [ ] Payment checkout succeeds
- [ ] Webhook processing works

### Non-Functional Requirements
- [ ] Page load time < 3 seconds on 3G
- [ ] No JavaScript console errors
- [ ] No network request failures
- [ ] Mobile responsive layouts preserved
- [ ] Lighthouse performance score > 70

### Quality Gates
- [ ] All browser test scripts pass
- [ ] Firebase deploy completes without errors
- [ ] Cloud Run deployment succeeds
- [ ] No Firestore security rule violations
- [ ] CLAUDE.md updated with new paths

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Module loading fails in Safari | Medium | High | Test on Safari; use feature detection |
| CSS @import waterfall delays | Medium | Medium | Accept tradeoff; consider HTTP/2 push |
| Global function reference breaks | High | High | Comprehensive globals.js; test all onclick |
| Backend route registration fails | Low | High | Blueprint testing before deploy |
| Firestore rules mismatch | Low | Critical | No data structure changes; validate |

### Rollback Plan

1. **Before starting:** Tag current state as `v7.7-pre-restructure`
2. **During each phase:** Keep old files until phase verified
3. **Emergency rollback:**
   ```bash
   git checkout v7.7-pre-restructure
   firebase deploy
   gcloud run deploy --source=. (from root)
   ```

## Dependencies & Prerequisites

**Required Before Starting:**
- [ ] Git tag `v7.7-pre-restructure` created
- [ ] Firebase hosting preview channel available
- [ ] Cloud Run deployment credentials verified
- [ ] Team notified of maintenance window

**No External Dependencies:**
- No new packages or libraries
- No build tools required
- No infrastructure changes

## Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Files at root | 57 | < 15 |
| Largest JS file | 6,757 lines | < 800 lines |
| Largest CSS file | 9,522 lines | < 600 lines |
| Time to find auth code | ~5 min searching | Open auth.js |
| Onboarding clarity | Poor | Self-documenting structure |

## References

### Internal References
- Current app.js: `public/app.js` (6,757 lines)
- Current style.css: `public/style.css` (9,522 lines)
- Current main.py: `main.py` (2,527 lines)
- Firebase config: `firebase.json`
- Security rules: `firestore.rules`

### External References
- ES6 Modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- CSS @import: https://developer.mozilla.org/en-US/docs/Web/CSS/@import
- Flask Blueprints: https://flask.palletsprojects.com/en/2.0.x/blueprints/
- Firebase Hosting: https://firebase.google.com/docs/hosting
