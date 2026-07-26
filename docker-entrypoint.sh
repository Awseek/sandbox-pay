#!/bin/bash
set -e

# ── 自动生成密钥（如果未设置）──
generate_secret() {
  openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n'
}
export JWT_SECRET="${JWT_SECRET:-$(generate_secret)}"
export GATEWAY_SECRET="${GATEWAY_SECRET:-$(generate_secret)}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(generate_secret)}"

# ── PostgreSQL 数据目录 ──
PGDATA="/var/lib/postgresql/data"

# 初始化数据库（仅首次）
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[entrypoint] Initializing PostgreSQL..."
  mkdir -p "$PGDATA"
  chown -R postgres:postgres "$PGDATA"
  su - postgres -c "initdb -D $PGDATA --encoding=UTF8 --locale=C"

  # 配置：仅本地连接，无需密码
  cat > "$PGDATA/pg_hba.conf" <<EOF
local all all trust
host  all all 127.0.0.1/32 trust
host  all all ::1/128 trust
EOF
  cat >> "$PGDATA/postgresql.conf" <<EOF
listen_addresses = '127.0.0.1'
port = 5432
EOF
fi

# 启动 PostgreSQL
echo "[entrypoint] Starting PostgreSQL..."
su - postgres -c "pg_ctl -D $PGDATA -l /var/log/postgresql/postgres.log start"
sleep 1

# 等待 PG 就绪
for i in $(seq 1 30); do
  su - postgres -c "pg_isready -q" && break
  echo "[entrypoint] Waiting for PostgreSQL... ($i)"
  sleep 1
done

# 创建数据库（如果不存在）
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='sandbox_pay'\" | grep -q 1" || \
  su - postgres -c "createdb sandbox_pay"

echo "[entrypoint] PostgreSQL ready."

# 运行迁移
echo "[entrypoint] Running migrations..."
cd /app/server
node -e "
const { AppDataSource } = require('./dist/data-source');
AppDataSource.initialize()
  .then(async () => {
    await AppDataSource.runMigrations();
    console.log('[entrypoint] Migrations done.');
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch(e => { console.error(e); process.exit(1); });
"

# 启动 NestJS
echo "[entrypoint] Starting server on port ${PORT:-3000}..."
cd /app/server
exec node dist/main.js
