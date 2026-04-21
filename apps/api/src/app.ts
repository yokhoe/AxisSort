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
import sizeOf from 'image-size';
import Database from 'better-sqlite3';
import { ImageRecord, ALL_SUPPORTED_EXTENSIONS } from '@coord-sort/shared';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
  });

  // Calculate project root relative to this file (apps/api/src/app.ts)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '../../../');

  // Database Initialization (M9)
  const dbPath = path.isAbsolute(process.env.DATABASE_PATH || './data/coord-sort.db')
    ? process.env.DATABASE_PATH!
    : path.resolve(projectRoot, process.env.DATABASE_PATH || './data/coord-sort.db');

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

  // Seed settings from .env if empty (M9)
  const seedSetting = (key: string, envValue: string) => {
    const existing = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
    if (!existing) {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(envValue));
    }
  };

  seedSetting('mode', process.env.SORT_MODE || 'Tinder');
  seedSetting('dryRun', process.env.DRY_RUN_MODE === 'true');

  const sourceRoot = path.isAbsolute(process.env.SOURCE_ROOT || '')
    ? process.env.SOURCE_ROOT!
    : path.resolve(projectRoot, process.env.SOURCE_ROOT || './dev-library/source');

  // Background Queue Worker (M6)
  const processQueue = async () => {
    const batchSize = Number(process.env.QUEUE_BATCH_SIZE) || 10;

    while (true) {
      const pending = db.prepare('SELECT * FROM actions WHERE status = ? ORDER BY createdAt ASC LIMIT ?').all('pending', batchSize) as any[];

      if (pending.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Idling
        continue;
      }

      app.log.info(`QueueWorker: Processing ${pending.length} actions...`);

      for (const action of pending) {
        try {
          db.prepare('UPDATE actions SET status = ? WHERE id = ?').run('processing', action.id);

          const stats = await fs.stat(action.sourcePath).catch(() => null);
          const fileSizeMB = stats ? stats.size / (1024 * 1024) : 0;

          const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('dryRun') as { value: string } | undefined;
          const isDryRun = row ? JSON.parse(row.value) : (process.env.DRY_RUN_MODE === 'true');

          if (isDryRun) {
            app.log.info(`[DRY RUN] Would move ${action.imageId}`);
          } else {
            const isDelete = action.actionType === 'trash' && action.destinationPath === 'SYSTEM DELETE';
            if (isDelete) {
              await fs.unlink(action.sourcePath);
            } else {
              const destDir = path.isAbsolute(action.destinationPath) ? action.destinationPath : path.resolve(projectRoot, action.destinationPath);
              await fs.mkdir(destDir, { recursive: true });
              await fs.rename(action.sourcePath, path.join(destDir, action.imageId));
            }
          }

          db.prepare('UPDATE actions SET status = ? WHERE id = ?').run('completed', action.id);

          // Adaptive Cooling: If file was large (>50MB), give the filesystem a breather
          if (fileSizeMB > 50) {
            const coolingMs = Math.min(1000, Math.floor(fileSizeMB * 2));
            await new Promise(resolve => setTimeout(resolve, coolingMs));
          }
        } catch (err: any) {
          app.log.error(`QueueWorker: Action ${action.id} failed: ${err.message}`);
          db.prepare('UPDATE actions SET status = ?, error = ? WHERE id = ?').run('failed', err.message, action.id);
        }
      }
    }
  };

  // Start worker in background
  processQueue().catch(err => app.log.error(`QueueWorker Fatal Error: ${err.message}`));

  app.log.info(`Project Root: ${projectRoot}`);
  app.log.info(`Source Root: ${sourceRoot}`);

  // Register plugins
  await app.register(cors, {
    origin: '*',
  });

  // Serve source images
  await app.register(fastifyStatic, {
    root: sourceRoot,
    prefix: '/images/',
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      sourceRoot
    };
  });

  // API Routes (Vite proxy strips /api prefix)
  app.get('/settings', async () => {
    // Persistent settings lookup (M9)
    const getSetting = (key: string, defaultValue: any) => {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row ? JSON.parse(row.value) : defaultValue;
    };

    const rawMode = getSetting('mode', process.env.SORT_MODE || 'Tinder');
    const isPlus = rawMode === 'TinderPlus';
    const isDryRun = getSetting('dryRun', process.env.DRY_RUN_MODE === 'true');

    const getLabel = (envVar: string | undefined, defaultPath: string | null) => {
      const trimmed = envVar?.trim();
      if (trimmed && trimmed.length > 0) return trimmed;
      return defaultPath ? path.basename(defaultPath) : 'Unknown';
    };

    const checkExists = async (p: string) => {
      try {
        await fs.access(p);
        return true;
      } catch {
        return false;
      }
    };

    const resolvePath = (p: string | undefined) => {
      if (!p) return null;
      return path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
    };

    const leftPath = resolvePath(process.env.DESTINATION_LEFT);
    const rightPath = resolvePath(process.env.DESTINATION_RIGHT);
    const upPath = resolvePath(process.env.DESTINATION_UP);
    const downPath = resolvePath(process.env.DESTINATION_DOWN);
    const trashPath = resolvePath(process.env.TRASH_PATH);

    const result = {
      mode: isPlus ? 'TinderPlus' : 'Tinder',
      dryRun: isDryRun,
      sourceRoot: {
        path: sourceRoot,
        exists: await checkExists(sourceRoot)
      },
      destinations: {
        left: {
          label: getLabel(process.env.DESTINATION_LEFT_LABEL, leftPath),
          path: leftPath,
          exists: leftPath ? await checkExists(leftPath) : false,
          isConfigured: !!leftPath
        },
        right: {
          label: getLabel(process.env.DESTINATION_RIGHT_LABEL, rightPath),
          path: rightPath,
          exists: rightPath ? await checkExists(rightPath) : false,
          isConfigured: !!rightPath
        },
        up: {
          label: getLabel(process.env.DESTINATION_UP_LABEL, upPath),
          path: upPath,
          exists: upPath ? await checkExists(upPath) : false,
          isConfigured: !!upPath
        },
        down: {
          label: getLabel(process.env.DESTINATION_DOWN_LABEL, downPath),
          path: downPath,
          exists: downPath ? await checkExists(downPath) : false,
          isConfigured: !!downPath
        },
        trash: {
          label: getLabel(process.env.DESTINATION_TRASH_LABEL, trashPath),
          path: trashPath,
          exists: trashPath ? await checkExists(trashPath) : true,
          isDelete: !trashPath,
          isConfigured: true // Trash is always "active" (either move or delete)
        },
      },
      queue: {
        softThreshold: Number(process.env.QUEUE_SOFT_THRESHOLD) || 25,
        hardThreshold: Number(process.env.QUEUE_HARD_THRESHOLD) || 50,
        resumeThreshold: Number(process.env.QUEUE_RESUME_THRESHOLD) || 10,
      }
    };

    app.log.info({ msg: 'Resolved settings', destinations: result.destinations });
    return result;
  });

  app.post('/settings', async (request) => {
    const body = request.body as any;

    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    if (body.mode) upsert.run('mode', JSON.stringify(body.mode));
    if (body.dryRun !== undefined) upsert.run('dryRun', JSON.stringify(body.dryRun));

    return { status: 'ok' };
  });

  app.get('/history', async () => {
    const rows = db.prepare('SELECT * FROM actions ORDER BY createdAt DESC LIMIT 100').all();
    return rows;
  });

  app.post('/images/action', async (request, reply) => {
    const { id, imageId, destinationPath, actionType, direction } = request.body as {
      id: string;
      imageId: string;
      destinationPath: string;
      actionType: 'move' | 'trash' | 'copy';
      direction: string;
    };

    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('dryRun') as { value: string } | undefined;
    const isDryRun = row ? JSON.parse(row.value) : (process.env.DRY_RUN_MODE === 'true');

    const sourcePath = path.join(sourceRoot, imageId);

    // Safety check: image must exist
    try {
      await fs.access(sourcePath);
    } catch {
      return reply.status(404).send({ error: `Image not found: ${imageId}` });
    }

    // Insert initial record (M6/M9) - Enqueue as 'pending'
    const insertAction = db.prepare(`
      INSERT INTO actions (id, imageId, sourcePath, destinationPath, actionType, direction, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createdAt = new Date().toISOString();
    insertAction.run(id, imageId, sourcePath, destinationPath, actionType, direction, 'pending', createdAt);

    return { status: 'enqueued', id };
  });

  app.get('/images/next', async () => {
    try {
      const files = await fs.readdir(sourceRoot);
      const imageFiles = files.filter(f =>
        ALL_SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase())
      );

      app.log.info(`Found ${imageFiles.length} files in ${sourceRoot}`);

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
      app.log.error(`Error reading source directory ${sourceRoot}: ${err}`);
      return [];
    }
  });

  app.get('/images/:id/metadata', async (request, reply) => {
    const { id } = request.params as { id: string };
    const filePath = path.join(sourceRoot, id);

    try {
      const stats = await fs.stat(filePath);
      // exifr.parse with true fetches all markers including dimensions from the file header
      const exif = await exifr.parse(filePath, true).catch(() => ({}));

      // Robust dimension extraction with image-size fallback
      let width = exif?.ExifImageWidth || exif?.ImageWidth || exif?.pixelXDimension || null;
      let height = exif?.ExifImageHeight || exif?.ImageHeight || exif?.pixelYDimension || null;

      if (!width || !height) {
        try {
          const dimensions = sizeOf(filePath);
          width = dimensions.width || null;
          height = dimensions.height || null;
        } catch (e) {
          app.log.error(`Failed to get dimensions using image-size for ${id}: ${e}`);
        }
      }

      return {
        filename: id,
        fullPath: filePath,
        size: stats.size,
        modifiedAt: stats.mtime,
        width,
        height,
        exif: exif || {},
      };
    } catch (err) {
      app.log.error(`Error reading metadata for ${id}: ${err}`);
      return reply.status(404).send({ error: 'Image not found' });
    }
  });

  return app;
}
