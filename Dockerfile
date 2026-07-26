# ═══════════════════════════════════════════════════════════
#  Sandbox Pay — Railway 部署 Dockerfile
#  使用 Railway PostgreSQL 插件
# ═══════════════════════════════════════════════════════════

# ── Stage 1: 构建前端 ──
FROM node:22-alpine AS build-client
WORKDIR /app
RUN npm install -g pnpm
COPY client/package.json client/pnpm-lock.yaml* ./
RUN pnpm install
COPY client/ .
RUN pnpm build

# ── Stage 2: 构建后端 ──
FROM node:22-alpine AS build-server
WORKDIR /app
RUN npm install -g pnpm
COPY server/package.json server/pnpm-lock.yaml* ./
RUN pnpm install
COPY server/ .
RUN pnpm build

# ── Stage 3: 运行时 ──
FROM node:22-alpine AS runtime
RUN npm install -g pnpm
WORKDIR /app

# 复制后端
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-server /app/server/node_modules ./server/node_modules
COPY --from=build-server /app/server/package.json ./server/

# 复制前端构建产物
COPY --from=build-client /app/dist ./client

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server/dist/main.js"]
