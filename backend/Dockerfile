# ─────────────────────────────────────────────
# Fika Takeaway Backend — Dockerfile
# Multi-stage build for lean production image
# ─────────────────────────────────────────────

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# Stage 2: Prisma generate
FROM node:20-alpine AS prisma
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 fikagroup && \
    adduser  --system --uid  1001 fikauser

# Copy built artifacts
COPY --from=deps   /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

COPY prisma ./prisma
COPY src    ./src

# Create uploads directory
RUN mkdir -p uploads && chown -R fikauser:fikagroup uploads

USER fikauser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/app.js"]
