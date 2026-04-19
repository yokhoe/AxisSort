/**
 * File: server.ts
 * Purpose: Backend startup entry point. Responsible for booting the server.
 * Main exports: None
 * Dependencies: buildApp, dotenv
 * Notes: Reads environment variables and starts the Fastify server.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { buildApp } from './app.js';

const start = async () => {
  try {
    const app = await buildApp();
    const port = Number(process.env.APP_PORT) || 3001;

    await app.listen({
      port,
      host: '0.0.0.0'
    });

    console.log(`Server listening on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
