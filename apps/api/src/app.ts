/**
 * File: app.ts
 * Purpose: Fastify application setup. Responsible for registering plugins and routes.
 * Main exports: buildApp
 * Dependencies: fastify, @fastify/cors, @fastify/static
 * Notes: Central place for app configuration.
 */

import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import exifr from 'exifr';
import { imageSize as sizeOf } from 'image-size';
import Database from 'better-sqlite3';
import { ImageRecord, ALL_SUPPORTED_EXTENSIONS } from '@axissort/shared';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
  });

  // Calculate project root relative to this file (apps/api/src/app.ts)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '../../../');

  // Database Initialization (M9)
  const dbPath = path.isAbsolute(process.env.DATABASE_PATH || './data/axissort.db')
    ? process.env.DATABASE_PATH!
    : path.resolve(projectRoot, process.env.DATABASE_PATH || './data/axissort.db');

  // Ensure data directory exists
  await fs.mkdir(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  app.log.info(`Database connected at ${dbPath}`);

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      imageId TEXT,
      sourcePath TEXT,
      destinationPath TEXT,
      actionType TEXT,
      direction TEXT,
      status TEXT,
      createdAt TEXT,
      error TEXT
    );
  `);

  const sourceRoot = path.isAbsolute(process.env.SOURCE_ROOT || '')
    ? process.env.SOURCE_ROOT!
    : path.resolve(projectRoot, process.env.SOURCE_ROOT || './dev-library/source');

  // Helper for cross-device moves (M9: Portability)
  const safeMove = async (src: string, dest: string) => {
    try {
      await fs.rename(src, dest);
    } catch (err: any) {
      if (err.code === 'EXDEV') {
        // Fallback for cross-device move: Copy then Delete
        await fs.copyFile(src, dest);
        await fs.unlink(src);
      } else {
        throw err;
      }
    }
  };

  // Register API routes with /api prefix (M9: Prioritized)
  await app.register(async (api) => {
    api.get('/settings', async () => {
      const getSetting = (key: string, defaultValue: any) => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
        return row ? JSON.parse(row.value) : defaultValue;
      };

      const getLabel = (envVar: string | undefined, defaultPath: string | null) => {
        const trimmed = envVar?.trim();
        if (trimmed && trimmed.length > 0 && trimmed !== 'undefined') return trimmed;
        return defaultPath ? path.basename(defaultPath) : 'Unknown';
      };

      const resolvePath = (p: string | undefined) => {
        if (!p) return null;
        const trimmed = p.trim();
        if (trimmed.length === 0 || trimmed === 'undefined') return null;
        return path.isAbsolute(trimmed) ? trimmed : path.resolve(projectRoot, trimmed);
      };

      const leftPath = resolvePath(process.env.DESTINATION_LEFT);
      const rightPath = resolvePath(process.env.DESTINATION_RIGHT);
      const upPath = resolvePath(process.env.DESTINATION_UP);
      const downPath = resolvePath(process.env.DESTINATION_DOWN);
      const trashPath = resolvePath(process.env.TRASH_PATH);

      // Determine Sort Mode (M9: Robustness)
      // Environment variables are the source of truth for configuration.
      const envMode = (process.env.SORT_MODE || 'auto').trim();
      let finalMode: string;

      if (envMode === 'Tinder' || envMode === 'TinderPlus') {
        // Explicit override from Docker/Env
        finalMode = envMode;
      } else {
        // Mode is 'auto' or unset. Check if UP/DOWN paths exist.
        if (!upPath || !downPath) {
          finalMode = 'Tinder'; // Cannot be Plus if paths are missing
        } else {
          // Both paths exist, use DB preference if available, default to Plus
          finalMode = getSetting('mode', 'TinderPlus');
        }
      }

      // Final sanity check
      if (finalMode === 'TinderPlus' && (!upPath || !downPath)) {
        finalMode = 'Tinder';
      }

      const isDryRun = getSetting('dryRun', process.env.DRY_RUN_MODE === 'true');

      const result = {
        mode: finalMode,
        dryRun: isDryRun,
        sourceRoot: {
          path: sourceRoot,
          exists: (await fs.access(sourceRoot).then(() => true).catch(() => false))
        },
        destinations: {
          left: {
            label: getLabel(process.env.DESTINATION_LEFT_LABEL, leftPath),
            path: leftPath,
            exists: leftPath ? (await fs.access(leftPath).then(() => true).catch(() => false)) : false,
            isConfigured: !!leftPath
          },
          right: {
            label: getLabel(process.env.DESTINATION_RIGHT_LABEL, rightPath),
            path: rightPath,
            exists: rightPath ? (await fs.access(rightPath).then(() => true).catch(() => false)) : false,
            isConfigured: !!rightPath
          },
          up: {
            label: getLabel(process.env.DESTINATION_UP_LABEL, upPath),
            path: upPath,
            exists: upPath ? (await fs.access(upPath).then(() => true).catch(() => false)) : false,
            isConfigured: !!upPath
          },
          down: {
            label: getLabel(process.env.DESTINATION_DOWN_LABEL, downPath),
            path: downPath,
            exists: downPath ? (await fs.access(downPath).then(() => true).catch(() => false)) : false,
            isConfigured: !!downPath
          },
          trash: {
            label: getLabel(process.env.DESTINATION_TRASH_LABEL, trashPath),
            path: trashPath,
            exists: trashPath ? (await fs.access(trashPath).then(() => true).catch(() => false)) : true,
            isDelete: !trashPath,
            isConfigured: true
          },
        },
        queue: {
          softThreshold: Number(process.env.QUEUE_SOFT_THRESHOLD) || 25,
          hardThreshold: Number(process.env.QUEUE_HARD_THRESHOLD) || 50,
          resumeThreshold: Number(process.env.QUEUE_RESUME_THRESHOLD) || 10,
        }
      };

      return result;
    });

    api.post('/settings', async (request) => {
      const body = request.body as any;
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (body.mode) upsert.run('mode', JSON.stringify(body.mode));
      if (body.dryRun !== undefined) upsert.run('dryRun', JSON.stringify(body.dryRun));
      return { status: 'ok' };
    });

    api.get('/history', async () => {
      return db.prepare('SELECT * FROM actions ORDER BY createdAt DESC LIMIT 100').all();
    });

    api.get('/images/next', async () => {
      try {
        const files = await fs.readdir(sourceRoot);
        const imageFiles = files.filter(f =>
          ALL_SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase())
        );

        const images: ImageRecord[] = await Promise.all(
          imageFiles.map(async (filename) => {
            const stats = await fs.stat(path.join(sourceRoot, filename));
            return {
              id: filename,
              filename,
              sourcePath: filename,
              extension: path.extname(filename),
              sizeBytes: stats.size,
            };
          })
        );
        return images;
      } catch (err) {
        api.log.error(`Error reading source directory ${sourceRoot}: ${err}`);
        return [];
      }
    });

    api.get('/images/:id/metadata', async (request, reply) => {
      const { id } = request.params as { id: string };
      const filePath = path.join(sourceRoot, id);
      try {
        const stats = await fs.stat(filePath);
        const exif = await exifr.parse(filePath, true).catch(() => ({}));
        let width = exif?.ExifImageWidth || exif?.ImageWidth || exif?.pixelXDimension || null;
        let height = exif?.ExifImageHeight || exif?.ImageHeight || exif?.pixelYDimension || null;
        if (!width || !height) {
          try {
            const buf = await fs.readFile(filePath);
            const dimensions = sizeOf(buf);
            width = dimensions.width || null;
            height = dimensions.height || null;
          } catch (e) {}
        }
        return { filename: id, fullPath: filePath, size: stats.size, modifiedAt: stats.mtime, width, height, exif: exif || {} };
      } catch (err) {
        return reply.status(404).send({ error: 'Image not found' });
      }
    });

    api.post('/images/action', async (request, reply) => {
      const { id, imageId, destinationPath, actionType, direction } = request.body as any;
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('dryRun') as { value: string } | undefined;
      const isDryRun = row ? JSON.parse(row.value) : (process.env.DRY_RUN_MODE === 'true');
      const sourcePath = path.join(sourceRoot, imageId);
      try { await fs.access(sourcePath); } catch { return reply.status(404).send({ error: `Image not found: ${imageId}` }); }
      db.prepare(`
        INSERT INTO actions (id, imageId, sourcePath, destinationPath, actionType, direction, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, imageId, sourcePath, destinationPath, actionType, direction, 'pending', new Date().toISOString());
      return { status: 'enqueued', id };
    });

    api.post('/actions/undo', async (request, reply) => {
      const lastAction = db.prepare(`SELECT * FROM actions WHERE status IN ('completed', 'pending', 'processing') ORDER BY createdAt DESC LIMIT 1`).get() as any;
      if (!lastAction) return reply.status(404).send({ error: 'No recent actions found to undo.' });
      try {
        if (lastAction.status === 'completed') {
          const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('dryRun') as { value: string } | undefined;
          const isDryRun = row ? JSON.parse(row.value) : (process.env.DRY_RUN_MODE === 'true');
          if (!isDryRun) {
            const currentPath = lastAction.actionType === 'trash' && lastAction.destinationPath === 'SYSTEM DELETE' ? null : path.join(lastAction.destinationPath, lastAction.imageId);
            if (currentPath) await safeMove(currentPath, lastAction.sourcePath);
          }
        }
        db.prepare('DELETE FROM actions WHERE id = ?').run(lastAction.id);
        return { status: 'undone', actionId: lastAction.id };
      } catch (err: any) {
        return reply.status(500).send({ error: `Undo failed: ${err.message}` });
      }
    });
  }, { prefix: '/api' });

  // Serve source images
  await app.register(fastifyStatic, {
    root: sourceRoot,
    prefix: '/images/',
  });

  // Serve the built frontend (M10: Docker Support)
  const webDistPath = path.resolve(projectRoot, 'apps/web/dist');
  try {
    await fs.access(webDistPath);
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
      decorateReply: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api') || request.url.startsWith('/images')) {
        reply.code(404).send({ error: 'Not Found', message: `Route ${request.method}:${request.url} not found` });
      } else {
        reply.sendFile('index.html');
      }
    });
    app.log.info(`Serving frontend from ${webDistPath}`);
  } catch (err) {
    app.log.warn('Web dist folder not found, skipping frontend serving.');
  }

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString(), sourceRoot };
  });

  return app;
}
