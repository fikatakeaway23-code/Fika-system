# ─────────────────────────────────────────────
# Fika Takeaway Backend — Dockerfile
# Multi-stage build for lean production image
# ─────────────────────────────────────────────

# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --only=production --ignore-scripts
RUN npx prisma generate

# Stage 2: Prisma generate
FROM node:20-slim AS prisma
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

# Stage 3: Production image
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 fikagroup && \
    useradd  --system --uid  1001 --gid fikagroup fikauser

# Copy built artifacts
COPY --from=deps   /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

COPY package.json ./
COPY prisma ./prisma
COPY src    ./src

# Create uploads directory
RUN mkdir -p uploads && chown -R fikauser:fikagroup uploads

USER fikauser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "src/app.js"]
