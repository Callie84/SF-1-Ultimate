# ==========================================
# Research Service - Multi-Stage Dockerfile
# (Muster analog apps/auth-service/Dockerfile, ohne Prisma)
# ==========================================

# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-alpine AS deps

# research-service hat keine nativen Module (ioredis, express, winston, exa-js
# sind pure JS) -> keine zusätzlichen Build-Tools nötig.
WORKDIR /app

COPY package.json package-lock.json* ./

# ALLE Dependencies (inkl. devDependencies für den Build)
RUN npm install --include=dev && \
    npm cache clean --force

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

RUN npm run build

# ==========================================
# Stage 3: Production Dependencies
# ==========================================
FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json* ./

# NUR Production-Dependencies
RUN npm install --omit=dev && \
    npm cache clean --force

# ==========================================
# Stage 4: Production Runtime (Runner)
# ==========================================
FROM node:20-alpine AS production

# dumb-init für sauberes Signal-Handling
RUN apk add --no-cache dumb-init

# Non-root User
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
