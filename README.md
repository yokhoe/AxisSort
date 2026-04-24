# Coord-Sort

**Coord-Sort** is a Tinder-style image sorting web application designed for speed, safety, and Homelab friendliness. Users review images one at a time as a **photo stack** and assign them to destination directories via swipes, keyboard shortcuts, or clicks.

---

## 🚀 Key Features

- **Photo Stack UI**: Interactive, Tinder-style interface for rapid image review.
- **Tinder & Tinder Plus Modes**:
  - **Tinder**: 2-way horizontal sorting (Left/Right).
  - **Tinder Plus**: 4-way sorting (Left/Right/Up/Down).
- **Metadata Inspection**: One-click expansion to view file properties and full EXIF data (Camera, ISO, Lens, etc.) with a frosted-glass overlay.
- **Safety First**: Built-in **Dry Run Mode** to simulate sorting without moving actual files.
- **Server-Managed**: Backend-driven filesystem operations ensure reliability and support for large libraries (5,000+ images).
- **The Breather System**: Intelligent queueing that prevents disk overload while maintaining a "no-lag" UI.

---

## 🏗️ The "Breather" System (Queue & Back-pressure)

**Coord-Sort** is built for speed. To keep the experience fluid, the app handles the heavy lifting in the background so you can keep swiping without waiting for your disk to finish every move.

- **Background Sorting**: When you swipe, the app instantly shows the next photo. The actual file moving or deleting happens silently behind the scenes.
- **Automatic Breather**: If you're swiping super fast, you might see a quick **"Momentary Pause"** overlay. This is just the app giving your computer a second to finish its current work before you continue.
- **Ready when you are**: As soon as the computer catches up, the pause disappears automatically, and you can get right back to sorting.

> **Technical Note**: The backend features a persistent background worker that operates independently of your browser tab. It processes actions in batches and includes **Adaptive Cooling**—automatically slowing down for a moment after moving large files (e.g., high-res RAWs or videos) to preserve your filesystem's performance.

This ensures you can sort as fast as your eyes can see, without ever worrying about overloading your system or losing track of your progress.

---

## 🗄️ Data Integrity & Persistence (SQLite)

While **Coord-Sort** feels like a lightweight web app, it uses a local SQLite database (`data/coord-sort.db`) to ensure your sorting work is never lost:

- **Bulletproof Queue**: Swipes are recorded on the server immediately. Even if you close your browser or lose your connection, the server keeps processing your "to-do list" until every file is safely moved.
- **Session Resume**: The app remembers exactly where you were. You can stop halfway through a 1,000-image folder and come back days later to the same spot.
- **Audit Trail**: Every single file operation (Move, Trash, Delete) is logged with a timestamp and the exact paths used. This provides a safety net if you ever need to verify where a specific photo went.

---

## 🛠️ Technical Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Node.js, Fastify, TypeScript.
- **Database**: SQLite (for settings, history, and queue state).
- **Metadata**: `exifr` and `image-size` for robust property extraction.

---

## 📈 Milestone Progress

**Current Overall Progress: 100%**

| Milestone | Description | Status | Progress |
| :--- | :--- | :--- | :--- |
| **M1: Skeleton** | Monorepo structure, TypeScript, Shared Package | ✅ Done | 100% |
| **M2: App Shell** | Header, Photo Stack, Settings Shell | ✅ Done | 100% |
| **M3: Scanning** | Source directory scanning & API | ✅ Done | 100% |
| **M4: Mechanics** | Swipe gestures & Keyboard shortcuts | ✅ Done | 100% |
| **M5: Config** | Path & Mode configuration UI | ✅ Done | 100% |
| **M6: Queue** | Decision enqueuing & The Breather | ✅ Done | 100% |
| **M7: Metadata** | EXIF parsing & Details drawer | ✅ Done | 100% |
| **M8: Safety** | Dry-run, Undo, Action logging | ✅ Done | 100% |
| **M9: Persistence**| SQLite DB & Session resume | ✅ Done | 100% |
| **M10: Docker** | Packaging & GHCR Automation | ✅ Done | 100% |

---

## 🛠️ Local Development

### 1. Prerequisites
- **Node.js LTS**
- **npm**

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/yokhoe/Coord-Sort.git
cd Coord-Sort

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 3. Run (Development)
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

## 🐳 Docker Deployment (Recommended)

The fastest way to get **Coord-Sort** running is using our pre-built image. We've included a production-ready `docker-compose.yml` in the root directory to get you started in seconds.

### 1. Prepare your Environment
Copy the example environment file and set your sorting preferences:
```bash
cp .env.example .env
```

### 2. Configure your Mounts
Open the provided `docker-compose.yml` and update the **volumes** section to point to your real photo folders on your computer or NAS:

```yaml
volumes:
  - ./data:/app/data
  - /path/to/your/source/photos:/photos/source:rw
  - /path/to/your/sorted/photos:/photos/sorted:rw
```

### 3. Launch
```bash
docker-compose up -d
```
The application will be live at `http://localhost:3001`.

---

## 🛡️ Product Philosophy
Coord-Sort is not a photo management platform; it is a **focused tool** for one job: getting your unsorted images into the right folders as fast and safely as possible. It prioritizes data integrity and understandable local-first architecture.
