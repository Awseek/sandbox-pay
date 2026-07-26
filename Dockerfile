# ═══════════════════════════════════════════════════════════
#  Sandbox Pay — 一键部署 Dockerfile
#  内置 PostgreSQL，零外部依赖
#  docker build -t sandbox-pay . && docker run -p 3000:3000 sandbox-pay
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
FROM node:22-bookworm-slim AS runtime

# 安装 PostgreSQL + 必要工具
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql postgresql-client curl && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g pnpm

# PostgreSQL 目录
RUN mkdir -p /var/lib/postgresql/data /var/log/postgresql && \
    chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql

WORKDIR /app

# 复制后端
COPY --from=build-server /app/server/dist ./server/dist
COPY --from=build-server /app/server/node_modules ./server/node_modules
COPY --from=build-server /app/server/package.json ./server/

# 复制前端构建产物
COPY --from=build-client /app/dist ./client

# 复制入口脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 环境变量（内置 PG，无需配置数据库连接）
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_HOST=127.0.0.1
ENV DB_PORT=5432
ENV DB_USERNAME=postgres
ENV DB_PASSWORD=""
ENV DB_DATABASE=sandbox_pay
ENV DB_SYNCHRONIZE=false
ENV DB_LOGGING=false
ENV ENABLE_API_DOCS=false
ENV ENABLE_SANDBOX=true
# JWT_SECRET / GATEWAY_SECRET / ENCRYPTION_KEY 在 entrypoint 中自动生成

EXPOSE 3000

VOLUME ["/var/lib/postgresql/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["/docker-entrypoint.sh"]
