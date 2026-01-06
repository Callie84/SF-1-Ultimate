# ==========================================
# Auth Service - Optimized Multi-Stage Dockerfile
# ==========================================

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-alpine AS deps

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci --include=dev && \
    npm cache clean --force

# ==========================================
# Stage 2: Prisma
# ==========================================
FROM node:20-alpine AS prisma

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# ==========================================
# Stage 3: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies and generated Prisma client
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ==========================================
# Stage 4: Production Dependencies
# ==========================================
FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json* ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy Prisma client from prisma stage
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

# ==========================================
# Stage 5: Production Runtime
# ==========================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy Prisma schema (needed for migrations)
COPY --from=prisma --chown=nodejs:nodejs /app/prisma ./prisma

# Copy package.json for metadata
COPY --chown=nodejs:nodejs package.json ./

# Create logs directory with correct permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
