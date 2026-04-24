# Stage 1: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 (native node modules)
RUN apt-get update && apt-get install -y python3 make g++

# Copy workspace configuration and package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build all packages (shared -> web -> api)
RUN npm run build

# Stage 2: Runtime
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/

RUN npm install --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# The app moves files, so we run as root by default to avoid permission issues
# with mounted NAS volumes.
EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]
