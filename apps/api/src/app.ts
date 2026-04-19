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
import { ImageRecord, ALL_SUPPORTED_EXTENSIONS } from '@coord-sort/shared';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
  });

  // Calculate project root relative to this file (apps/api/src/app.ts)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(__dirname, '../../../');

  const sourceRoot = path.isAbsolute(process.env.SOURCE_ROOT || '')
    ? process.env.SOURCE_ROOT!
    : path.resolve(projectRoot, process.env.SOURCE_ROOT || './dev-library/source');

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
    const rawMode = process.env.SORT_MODE || 'Tinder';
    const isPlus = rawMode === 'TinderPlus';

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
      dryRun: process.env.DRY_RUN_MODE === 'true',
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
