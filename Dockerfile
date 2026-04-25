# Stage 1: Build
FROM node:22-bookworm AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 (native node modules)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration and package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies (including devDeps for building)
RUN npm ci

# Copy source code (respecting .dockerignore)
COPY . .

# Build all packages (shared -> web -> api)
RUN npm run build

# Stage 2: Runtime
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Use --omit=dev to keep image small
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Ensure data directory exists for default SQLite path
RUN mkdir -p data

EXPOSE 3001

# Run the API server
CMD ["node", "apps/api/dist/server.js"]
