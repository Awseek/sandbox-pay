# syntax=docker/dockerfile:1.7
# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# Trim dev deps for the runtime image.
RUN pnpm prune --prod

# ---- Runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Run as a non-root user.
RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER app
EXPOSE 3000

CMD ["node", "dist/main"]
