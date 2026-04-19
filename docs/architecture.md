# Architecture

Coord-Sort is built as a **server-managed local web app** using a monorepo layout.

## High-Level Flow

1.  **Frontend (React/Vite)**: The user interface where sorting decisions are made. It communicates with the backend via a REST API.
2.  **Backend (Fastify)**: The orchestration layer. It handles filesystem access, directory scanning, and image serving. It also manages the action queue and communicates with the database.
3.  **Database (SQLite)**: Persists application settings, the intent queue, action history, and session state.
4.  **Shared Package**: Contains TypeScript types and constants used by both frontend and backend to ensure consistency.

## Key Components

### Filesystem Orchestration
The backend is responsible for scanning the `SOURCE_ROOT` and performing move/copy/trash operations in the `DESTINATION_ROOT`.

### Action Queue
To prevent UI lag and disk thrashing, all file operations are processed through a persistent queue.
- **Intent Queue**: Records the user's swipe decision immediately in the DB.
- **Execution Queue**: Drains the intent queue by performing actual filesystem changes in batches.

### Metadata Extraction
Uses `exifr` for header metadata and `image-size` for robust dimension detection.
