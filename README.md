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
- **Smart Queueing**: A "no-lag" system that works in the background and gives your computer a breather if you're swiping super fast.

---

## 🏗️ The "Breather" System (Queue & Back-pressure)

**Coord-Sort** is built for speed. To keep the experience fluid, the app handles the heavy lifting in the background so you can keep swiping without waiting for your disk to finish every move.

- **Background Sorting**: When you swipe, the app instantly shows the next photo. The actual file moving or deleting happens silently behind the scenes.
- **Automatic Breather**: If you're swiping super fast, you might see a quick **"Momentary Pause"** overlay. This is just the app giving your computer a second to finish its current work before you continue.
- **Ready when you are**: As soon as the computer catches up, the pause disappears automatically, and you can get right back to sorting.

This ensures you can sort as fast as your eyes can see, without ever worrying about overloading your system or losing track of your progress.

---

## 🛠️ Technical Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Node.js, Fastify, TypeScript.
- **Database**: SQLite (for settings, history, and queue state).
- **Metadata**: `exifr` and `image-size` for robust property extraction.

---

## 📈 Milestone Progress

**Current Overall Progress: 48%**

| Milestone | Description | Status | Progress |
| :--- | :--- | :--- | :--- |
| **M1: Skeleton** | Monorepo structure, TypeScript, Shared Package | ✅ Done | 100% |
| **M2: App Shell** | Header, Photo Stack, Settings Shell | 🚧 Refining | 90% |
| **M3: Scanning** | Source directory scanning & API | ✅ Done | 100% |
| **M4: Mechanics** | Swipe gestures & Keyboard shortcuts | ✅ Done | 100% |
| **M5: Config** | Path & Mode configuration | 🚧 Partial | 70% |
| **M6: Queue** | Decision enqueuing & Background draining | ⏳ Next | 0% |
| **M7: Metadata** | EXIF parsing & Details drawer | ✅ Done | 100% |
| **M8: Safety** | Dry-run, Undo, Action logging | 🚧 Partial | 20% |
| **M9: Persistence**| SQLite DB & Session resume | ⏳ Next | 0% |
| **M10: Docker** | Packaging & Compose support | ⏳ Later | 0% |

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

### 3. Run
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

---

## 🛡️ Product Philosophy
Coord-Sort is not a photo management platform; it is a **focused tool** for one job: getting your unsorted images into the right folders as fast and safely as possible. It prioritizes data integrity and understandable local-first architecture.
