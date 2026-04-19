# AGENTS.md

> Project playbook for **Coord-Sort**
>
> This document is the source of truth for planning, building, testing, and packaging the project.
> It is written to be beginner-friendly and should help future contributors, coding agents, and your future self make steady progress without unnecessary pain.

---

## 1. Project Identity

### Project name
**Coord-Sort**

### Project idea
Coord-Sort is a Tinder-style image sorting web application.
Users review images one at a time as a photo stack and assign each image to a destination by swiping or using keyboard shortcuts.

### Core UX goals
- Show images as a **photo stack**.
- Support **2-direction sorting** at first:
  - left
  - right
- Support **4-direction sorting** as an extended mode:
  - left
  - right
  - up
  - down
- Reserve **top-left** for a hamburger menu.
- Reserve **top-right** for a trash action / trash destination.
- Clicking or tapping an image should show:
  - image properties
  - EXIF metadata if available
- The user should be able to set:
  - source directory
  - destination directories
  - mode (2-way or 4-way)
- The app should eventually be deployable as a **Docker Compose** service.

### Product philosophy
Coord-Sort is not meant to be a giant photo management platform.
It is meant to be:
- focused
- fast
- safe
- understandable
- local-first / homelab-friendly

---

## 2. Primary Technical Direction

### Recommended stack
Use the following stack unless there is a very strong reason to change it:

#### Frontend
- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Framer Motion**

#### Backend
- **Node.js**
- **Fastify**
- **TypeScript**

#### Data storage
- **SQLite**

#### Metadata
- **exifr** for EXIF parsing

#### Packaging / deployment
- **Docker**
- **Docker Compose**

### Why this stack
This stack was chosen because it gives:
- one main language across frontend and backend
- strong type safety from TypeScript
- a modern and responsive UI stack
- a backend that is good for filesystem orchestration
- a simple database for settings, history, queue state, and undo logs
- an easy path from local development to homelab deployment

### Architectural emphasis
Coord-Sort should be built as a **server-managed local web app**.

That means:
- the frontend is the control surface and visual experience
- the backend owns:
  - filesystem access
  - scanning
  - queueing
  - move/copy/trash operations
  - persistence

This is preferred over a browser-only filesystem design for long-term reliability and Docker deployment.

---

## 3. Development Strategy

### Rule: build locally first, package later
Do **not** start with Docker.

Build the app in two stages:

#### Stage 1: local development
Run frontend and backend directly on your machine.
This is the fastest and easiest way to:
- tinker
- debug
- test gestures
- adjust queue logic
- inspect logs
- make fast changes

#### Stage 2: Docker packaging
Once the app works locally and core flows are stable:
- build the production frontend
- serve it from the backend
- package everything in Docker
- create a comprehensive `docker-compose.yml`

### Important rule
Docker should be **packaging**, not a redesign.
The app should behave the same in both modes.
Only these things should change:
- file paths
- environment variables
- production build details

---

## 4. Performance and Scaling Expectations

### Primary target
The app should comfortably support a source directory containing **5,000 images**.

### Performance rule
The app must never behave like a gallery that loads all images at once.
It must behave like a **queue-based photo sorter**.

### Required performance strategies
- Read filenames and basic file stats first.
- Do **not** decode or fully load all images at startup.
- Do **not** parse EXIF for all images at startup.
- Render only a small number of visible photos.
- Preload only a small number of upcoming images.
- Process filesystem writes through a controlled queue.

### Preferred preload behavior
Keep only:
- current image
- 1–2 previous items if needed
- 5–30 next queued records
- 1–3 decoded display images

Do **not** keep all image blobs in memory.

### Filesystem I/O rule
All move/copy/trash operations must be handled through a **write-behind queue** with back-pressure.

---

## 5. Queue-Based File Action Model

### Why this exists
Immediate file operations on every swipe can cause:
- UI hitching
- unnecessary disk thrashing
- poor performance on HDDs / NAS / external drives
- harder recovery and undo

### Required design
Implement two layers:

#### 1. Intent queue
This records what the user decided.
Each swipe creates an intent entry immediately.

#### 2. Execution queue
The backend processes queued intents in batches and performs the actual filesystem changes.

### User experience rule
The user interaction should feel immediate.
Swiping should not wait for file writes unless the queue exceeds a configured threshold.

### Suggested queue thresholds for v1
These are defaults and should later become settings:

- `softThreshold = 25`
- `hardThreshold = 50`
- `resumeThreshold = 10`
- `batchSize = 10`
- `workerConcurrency = 1`

### Queue behavior
#### Normal state
- user swipes
- action intent is recorded
- next photo appears immediately
- backend drains queue in background

#### Warning state
- queue count reaches soft threshold
- show subtle status message
- continue interaction

#### Pause state
- queue count reaches hard threshold
- pause swiping temporarily
- show progress overlay
- backend drains queue until it falls below resume threshold
- resume interaction automatically

### Persistence rule
Every queued intent must be persisted to SQLite as quickly as possible.
Do not keep queue state only in memory.

### Failure handling rule
Failed actions must never disappear silently.
Each failed action must:
- remain visible in logs or status
- store an error message
- be retryable or skippable

---

## 6. Safety Rules

### These features are required
- **dry-run mode**
- **undo last action**
- action logging
- duplicate filename handling
- missing destination handling
- permission error handling
- queue failure handling
- session recovery / resume

### Trash rule
The trash action should default to a configurable destination folder.
It should not permanently delete files unless the app later supports an explicit and clearly confirmed delete mode.

### Beginner protection rule
Never test first against your real photo archive.
Always start with a fake or disposable test set.

Recommended test progression:
- 20 images
- 100 images
- 1,000 images
- 5,000 images

---

## 7. Primary Runtime Modes

### Mode A: Local development mode
Use direct local paths configured through `.env`.

Examples:
- source: `./dev-library/source`
- destination keep: `./dev-library/keep`
- destination review: `./dev-library/review`
- destination trash: `./dev-library/trash`

### Mode B: Docker homelab mode
Use bind-mounted paths.

Examples inside container:
- source root: `/library/source`
- destination root: `/library/destinations`
- app data: `/app/data`

### Design rule
The core application should not care whether it runs in local mode or Docker mode.
It should only consume normalized paths from configuration.

---

## 8. Repository Structure

Use a monorepo layout.

```text
coord-sort/
  AGENTS.md
  README.md
  package.json
  .gitignore
  .editorconfig
  .env.example
  docs/
    architecture.md
    api.md
    ui-flows.md
    glossary.md
  data/
    .gitkeep
  dev-library/
    source/
    keep/
    review/
    trash/
  apps/
    web/
      package.json
      tsconfig.json
      vite.config.ts
      index.html
      src/
        main.tsx
        App.tsx
        styles/
        components/
        features/
        hooks/
        lib/
        types/
    api/
      package.json
      tsconfig.json
      src/
        server.ts
        app.ts
        routes/
        services/
        repositories/
        db/
        utils/
        types/
  packages/
    shared/
      package.json
      tsconfig.json
      src/
        types/
        constants/
        validators/
  docker/
    Dockerfile
    docker-compose.yml
```

---

## 9. File-by-File Responsibility Guide

This section exists to reduce confusion when creating files.

### Root files

#### `AGENTS.md`
Project operating manual.
Use this for:
- architecture rules
- coding rules
- environment setup
- development workflow
- packaging plan

#### `README.md`
Public-facing onboarding document.
Should explain:
- what the app does
- how to run it
- basic commands
- screenshots later

#### `.env.example`
Example environment variables.
Should never contain secrets.

#### `package.json`
Root workspace configuration.
Should define workspace scripts for running both frontend and backend.

---

### `apps/web`
Frontend application.

#### `src/main.tsx`
Frontend entry point.
Mounts React app.

#### `src/App.tsx`
Top-level application shell.
Contains layout structure and major providers.

#### `src/components/`
Reusable UI pieces.
Examples:
- `AppHeader.tsx`
- `SwipeCard.tsx`
- `CardStack.tsx`
- `QueueIndicator.tsx`
- `PauseOverlay.tsx`
- `MetadataDrawer.tsx`

#### `src/features/`
Feature-oriented folders.
Examples:
- `sorting/`
- `settings/`
- `queue/`
- `metadata/`

#### `src/hooks/`
Custom React hooks.
Examples:
- `useQueueStatus.ts`
- `useKeyboardShortcuts.ts`
- `useSwipeEngine.ts`

#### `src/lib/`
Utility code and API client code.
Examples:
- `apiClient.ts`
- `formatters.ts`
- `paths.ts`

#### `src/types/`
Frontend-specific types if not shared.

---

### `apps/api`
Backend application.

#### `src/server.ts`
Backend startup entry point.
Responsible for booting the server.

#### `src/app.ts`
Fastify application setup.
Responsible for:
- registering plugins
- registering routes
- applying middleware-like behavior

#### `src/routes/`
HTTP route definitions.
Examples:
- `healthRoutes.ts`
- `settingsRoutes.ts`
- `imageRoutes.ts`
- `queueRoutes.ts`
- `actionRoutes.ts`
- `metadataRoutes.ts`

#### `src/services/`
Business logic layer.
Examples:
- `DirectoryScannerService.ts`
- `QueueService.ts`
- `FileActionService.ts`
- `SessionService.ts`
- `ExifService.ts`

#### `src/repositories/`
Database access layer.
Examples:
- `SettingsRepository.ts`
- `QueueRepository.ts`
- `ActionLogRepository.ts`
- `ImageRepository.ts`

#### `src/db/`
Schema creation and DB connection.
Examples:
- `connection.ts`
- `schema.ts`
- `migrations.ts`

#### `src/utils/`
Shared backend helper functions.
Examples:
- path validation
- filename conflict handling
- logging helpers

#### `src/types/`
Backend-only types.

---

### `packages/shared`
Code shared between frontend and backend.

Examples:
- shared enums
- API contracts
- request/response types
- validation constants

---

## 10. Coding Standards

### Main language rule
Use **TypeScript** for both frontend and backend.

### Style rule
Prefer simple, explicit, readable code over clever code.
This project is intended to be approachable for someone newer to web development.

### Function size rule
Keep functions focused.
If a function does more than one major thing, consider splitting it.

### Naming rules
- Use clear descriptive names.
- Avoid cryptic abbreviations.
- Prefer names like `processPendingQueueItems` instead of `procQueue`.

### Error handling rule
Do not silently swallow errors.
Return clear messages and log useful context.

### Async rule
Use async/await.
Avoid deeply nested promise chains.

### Commenting rule
Every file and every function must include documentation comments.
This is mandatory for this project.

---

## 11. Required File Header Comment Template

Every source file should start with a file header comment.

Use this template:

```ts
/**
 * File: SwipeCard.tsx
 * Purpose: Displays a sortable photo card and handles swipe-related UI state.
 * Main exports: SwipeCard
 * Dependencies: React, Framer Motion
 * Notes: Used by CardStack to render the current image in the sorting queue.
 */
```

### Why this matters
This makes it easier to understand:
- what the file does
- why it exists
- what it exports
- where it fits in the app

---

## 12. Required Function Comment Template

Every function must include a JSDoc comment.

Use this template:

```ts
/**
 * Adds a user swipe decision to the action queue and returns the updated queue state.
 * @param imageId The unique identifier of the image being sorted.
 * @param direction The direction chosen by the user.
 * @returns The latest queue status after the action intent is stored.
 */
async function enqueueSwipeDecision(imageId: string, direction: SwipeDirection): Promise<QueueStatus> {
  // Implementation goes here.
}
```

### Include in comments when relevant
- what the function does
- parameters
- return value
- side effects
- assumptions
- error conditions

---

## 13. Suggested Shared Types

These types should exist early in the project.

```ts
/**
 * Defines the directions supported by the sorting interface.
 */
export type SwipeDirection = "left" | "right" | "up" | "down" | "trash";
```

```ts
/**
 * Describes one image record known to the application.
 */
export interface ImageRecord {
  id: string;
  sourcePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  modifiedAt?: string;
  exifTakenAt?: string;
}
```

```ts
/**
 * Describes a user-configurable destination bucket.
 */
export interface DestinationConfig {
  id: string;
  label: string;
  direction: SwipeDirection;
  destinationPath: string;
  actionType: "move" | "copy" | "trash" | "mark";
  isEnabled: boolean;
}
```

```ts
/**
 * Represents one pending or completed filesystem action.
 */
export interface ActionIntent {
  id: string;
  imageId: string;
  sourcePath: string;
  destinationPath: string;
  actionType: "move" | "copy" | "trash";
  direction: SwipeDirection;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  errorMessage?: string;
}
```

```ts
/**
 * Defines queue control settings for filesystem back-pressure.
 */
export interface QueueConfig {
  softThreshold: number;
  hardThreshold: number;
  resumeThreshold: number;
  batchSize: number;
  workerConcurrency: number;
}
```

```ts
/**
 * Summarizes current queue state for the frontend.
 */
export interface QueueStatus {
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  isPaused: boolean;
  isDraining: boolean;
}
```

---

## 14. Database Guidance

### Database choice
Use SQLite.

### Why SQLite
It is a good fit for:
- settings
- queue state
- action history
- undo state
- session progress
- image catalog metadata

### Tables to plan for
At minimum, expect tables like:
- `app_settings`
- `destinations`
- `images`
- `action_queue`
- `action_log`
- `session_state`

### Schema rule
Start simple.
Do not over-normalize too early.
Only add complexity when it solves a real problem.

---

## 15. API Planning Guidance

The backend should expose simple HTTP endpoints.

### Suggested early routes
- `GET /health`
- `GET /settings`
- `PUT /settings`
- `GET /images/next`
- `GET /images/:id/metadata`
- `POST /queue/enqueue`
- `GET /queue/status`
- `POST /queue/drain`
- `POST /actions/undo`
- `GET /session`

### API design rule
Keep request and response bodies small and explicit.
Use shared TypeScript types when possible.

---

## 16. Frontend UX Guidance

### Main layout
- top-left: hamburger menu
- top-right: trash button
- center: photo stack
- optional bottom labels for destination hints
- metadata drawer or modal for image details
- queue indicator visible but not distracting

### Input support
Support all of these eventually:
- mouse drag
- touch swipe
- keyboard shortcuts
- button-based actions as fallback

### Accessibility rule
Even though this is a swipe-driven UI, basic accessibility still matters.
Provide keyboard support and visible action buttons where possible.

---

## 17. Development Milestones

Build in this order.

### Milestone 1: project skeleton
- create monorepo folders
- configure TypeScript
- configure frontend and backend startup
- add shared package

### Milestone 2: app shell
- build header
- build placeholder photo stack
- build settings panel shell
- build queue status area

### Milestone 3: source scanning
- scan source directory
- list supported image files
- return first queue item

### Milestone 4: swipe mechanics
- implement left/right
- add keyboard shortcuts
- add stack visuals

### Milestone 5: destination configuration
- configure source and destination paths
- switch between 2-way and 4-way mode
- configure trash destination

### Milestone 6: queue system
- enqueue swipe decisions
- background drain
- warning thresholds
- pause overlay

### Milestone 7: metadata
- click/tap image to open file properties
- parse EXIF on demand

### Milestone 8: safety features
- dry-run mode
- undo
- action history
- failure handling

### Milestone 9: persistence
- session resume
- restore queue state
- restore settings

### Milestone 10: Docker packaging
- production build
- Dockerfile
- Docker Compose
- bind mounts
- documentation

---

## 18. Local Development Environment Setup

This section is intentionally detailed for beginners.

### Required tools for all platforms
Install these first:
- **Git**
- **Node.js LTS**
- **npm** (comes with Node.js)
- **Visual Studio Code**
- **Docker Desktop** (later, not required on day one)

### Recommended versions
Use a current **Node.js LTS** release.
Avoid using very old Node versions.

### Recommended VS Code extensions
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Docker
- GitLens (optional)
- SQLite Viewer (optional)

---

## 19. macOS Development Setup

### Step 1: install Homebrew
If Homebrew is not installed, install it from the official Homebrew site.
Homebrew makes it much easier to install developer tools on macOS.

### Step 2: install Git
If Git is not already installed, install it using Homebrew or Apple command line tools.

### Step 3: install Node.js LTS
Install Node.js LTS.
After installation, verify:

```bash
node -v
npm -v
```

### Step 4: install Visual Studio Code
Install VS Code and the recommended extensions.

### Step 5: create project folder
Example:

```bash
mkdir coord-sort
cd coord-sort
```

### Step 6: initialize Git repository
```bash
git init
```

### Step 7: create starter folders
```bash
mkdir -p apps/web apps/api packages/shared docs data dev-library/source dev-library/keep dev-library/review dev-library/trash docker
```

### Step 8: open in VS Code
```bash
code .
```

### Step 9: create `.env` from example
Create `.env` based on `.env.example`.

### Step 10: run frontend and backend in dev mode
Once the apps exist, run them in separate terminals.

---

## 20. Windows Development Setup

### Recommended approach
Use one of these paths:

#### Option A: native Windows
This is simpler for many beginners.
Good if you are comfortable using PowerShell and standard Windows tools.

#### Option B: WSL2
This is often smoother for Node-based projects and Docker workflows.
If you are comfortable learning a bit more, WSL2 is often the best long-term option.

### Recommended beginner choice
If you are new and want fewer moving parts at first:
- start with **native Windows**
- move to **WSL2** only if needed later

### Step 1: install Git for Windows
Install Git and make sure `git` works in PowerShell.

### Step 2: install Node.js LTS
Install Node.js LTS.
Verify in PowerShell:

```powershell
node -v
npm -v
```

### Step 3: install Visual Studio Code
Install VS Code and the recommended extensions.

### Step 4: create project folder
Example in PowerShell:

```powershell
mkdir coord-sort
cd coord-sort
```

### Step 5: initialize Git repository
```powershell
git init
```

### Step 6: create starter folders
```powershell
mkdir apps\web, apps\api, packages\shared, docs, data, docker
mkdir dev-library\source, dev-library\keep, dev-library\review, dev-library\trash
```

### Step 7: open in VS Code
```powershell
code .
```

### Step 8: create `.env` from example
Create `.env` based on `.env.example`.

### Step 9: run frontend and backend in separate terminals
Use one terminal for frontend and one for backend.

---

## 21. Suggested `.env.example`

Use something like this later:

```env
# General
NODE_ENV=development
APP_PORT=3001
WEB_PORT=5173

# Database
DATABASE_PATH=./data/coord-sort.db

# Development library paths
SOURCE_ROOT=./dev-library/source
DESTINATION_ROOT=./dev-library
TRASH_PATH=./dev-library/trash

# Queue defaults
QUEUE_SOFT_THRESHOLD=25
QUEUE_HARD_THRESHOLD=50
QUEUE_RESUME_THRESHOLD=10
QUEUE_BATCH_SIZE=10
QUEUE_WORKER_CONCURRENCY=1

# Safety
DRY_RUN_MODE=true
```

### Environment variable rule
All configurable paths and thresholds should come from configuration, not hardcoded constants.

---

## 22. Suggested Workspace Scripts

Root `package.json` should eventually expose easy commands.

Examples:

```json
{
  "scripts": {
    "dev:web": "npm --workspace apps/web run dev",
    "dev:api": "npm --workspace apps/api run dev",
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
    "build": "npm run build --workspaces",
    "lint": "npm run lint --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

### Beginner note
The `concurrently` package is helpful when you want one command to start frontend and backend together.

---

## 23. Testing Guidance

### Early testing rules
- start with fake test images
- enable dry-run mode first
- test queue behavior before real file moves
- test duplicate filenames intentionally
- test missing destination folders intentionally
- test pause / resume thresholds intentionally

### Manual test checklist
At minimum, verify:
- source folder loads
- left/right sorting works
- 4-way mode works
- trash works
- queue count changes correctly
- pause overlay appears at hard threshold
- app resumes after queue drains
- metadata panel opens
- EXIF appears when available
- undo works
- dry-run mode prevents real file changes

### Scale test plan
Use increasingly larger libraries:
- 20 images
- 100 images
- 1,000 images
- 5,000 images

Track:
- startup scan time
- responsiveness while swiping
- queue drain speed
- memory behavior

---

## 24. Logging Guidance

### Log categories to include
- startup
- configuration
- directory scanning
- queue operations
- file actions
- failures
- session restore

### Logging rule
Logs should be easy to read and useful for debugging.
Do not log only vague messages.

Prefer messages like:
- `Enqueued move action for IMG_1024.JPG to destination keep`
- `Queue hard threshold reached; pausing interaction`
- `Move failed for IMG_2048.JPG: destination folder missing`

---

## 25. Beginner-Friendly Implementation Advice

### Rule 1: build one thin slice at a time
Do not try to build everything at once.
Always complete a small working slice first.

Example thin slice:
- one source folder
- one destination folder
- left swipe only
- no EXIF yet
- dry-run only

Then expand.

### Rule 2: keep the UI simple before making it pretty
Get the workflow working first.
Polish can come later.

### Rule 3: keep notes in `docs/`
Whenever something becomes confusing, document it.

Suggested docs:
- `architecture.md`
- `ui-flows.md`
- `queue-design.md`
- `known-issues.md`

### Rule 4: use Git often
Commit small changes often.
That makes it much easier to recover from mistakes.

Suggested beginner commit style:
- `feat: add basic app shell`
- `feat: add queue status endpoint`
- `fix: handle missing destination folder`
- `docs: add local dev setup notes`

---

## 26. Future Docker Packaging Plan

### Packaging target
One app container for v1 is enough.

Inside the container:
- backend server
- built frontend served by backend
- SQLite DB stored in mounted data path

### Docker goals
- easy deploy to home lab
- clear bind mounts
- simple environment configuration
- safe access only to intended folders

### Expected mounts
Examples:
- host data folder -> `/app/data`
- host source library -> `/library/source`
- host destination library -> `/library/destinations`

### Docker rule
The app should only operate within approved mounted roots.
Do not allow arbitrary traversal outside configured roots.

---

## 27. Non-Negotiable Engineering Rules

These rules should always be followed.

1. Do not silently delete user files.
2. Do not perform uncontrolled concurrent file writes.
3. Do not load thousands of images into memory at once.
4. Do not parse all EXIF metadata at startup.
5. Do not assume destination folders always exist.
6. Do not assume move/copy always succeeds.
7. Do not keep queue state only in memory.
8. Do not skip comments and documentation.
9. Do not optimize prematurely before a working baseline exists.
10. Do not test first on irreplaceable real photos.

---

## 28. First Recommended Implementation Slice

If starting from zero, build this first:

### Goal
A minimal but working vertical slice.

### Include
- basic frontend shell
- one photo card shown at a time
- source directory scan endpoint
- left and right buttons
- dry-run enqueue only
- queue status endpoint
- simple SQLite persistence for queue entries

### Do not include yet
- EXIF
- drag gestures
- 4-way mode
- undo
- Docker
- advanced styling

### Why
A small working slice creates confidence and reduces confusion.

---

## 29. Definition of Done for v1

Coord-Sort v1 is complete when it can:
- load a configured source directory
- support 2-way and 4-way sorting
- show images as stacked cards
- show metadata / EXIF on click
- persist queue and session state
- process move/copy/trash through a queue
- pause interaction when queue thresholds are exceeded
- resume automatically when queue drains
- support undo of recent actions
- run locally in development mode
- run in Docker via Docker Compose
- include documentation sufficient for a beginner to run and modify it

---

## 30. Final Guidance to Future Contributors and Agents

When making changes:
- read this file first
- preserve beginner-friendly clarity
- prefer explicitness over cleverness
- add or update comments whenever behavior changes
- update docs when architecture or setup changes
- keep the path from local development to Docker deployment simple

If there is uncertainty, choose the solution that is:
- safer for files
- easier to understand
- easier to debug
- easier to explain later

That is the spirit of Coord-Sort.

---

NO AI SLOP!
