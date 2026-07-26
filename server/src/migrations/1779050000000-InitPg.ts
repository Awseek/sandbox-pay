import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Consolidated initial migration — PostgreSQL.
 * Merges all previous MySQL migrations into a single PG-compatible migration.
 */
export class InitPg1779050000000 implements MigrationInterface {
  name = 'InitPg1779050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- users ----
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "username" varchar(20) NOT NULL,
        "password" varchar(100) NOT NULL,
        "role" varchar(20) NOT NULL DEFAULT 'Admin',
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username")
      )
    `);

    // ---- merchants ----
    await queryRunner.query(`
      CREATE TABLE "merchants" (
        "id" SERIAL PRIMARY KEY,
        "name" varchar(255) NOT NULL,
        "appKey" varchar(255) NOT NULL,
        "appSecret" varchar(255) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_merchants_appKey" UNIQUE ("appKey")
      )
    `);

    // ---- payment_orders ----
    await queryRunner.query(`
      CREATE TABLE "payment_orders" (
        "id" varchar(32) NOT NULL,
        "orderNo" varchar(64) NOT NULL,
        "amount" decimal(18,2) NOT NULL,
        "productName" varchar(255) NOT NULL,
        "payMethod" varchar(32) NOT NULL,
        "status" int NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "expireAt" TIMESTAMP NOT NULL,
        "payAt" TIMESTAMP NULL,
        "exchangeRate" decimal(18,10) NULL,
        "foreignAmount" decimal(18,2) NULL,
        "foreignCurrency" varchar(10) NULL,
        "externalOrderNo" varchar(64) NULL,
        "thirdPartyTradeNo" varchar(128) NULL,
        "refundedAmount" decimal(18,2) NOT NULL DEFAULT 0,
        "refundTradeNo" varchar(128) NULL,
        "refundAt" TIMESTAMP NULL,
        "channelCost" decimal(18,2) NOT NULL DEFAULT 0,
        "fee" decimal(18,2) NOT NULL DEFAULT 0,
        "settleAmount" decimal(18,2) NOT NULL DEFAULT 0,
        "returnUrl" varchar(512) NULL,
        "notifyUrl" varchar(512) NULL,
        "merchantId" int NULL,
        "userId" int NOT NULL DEFAULT 1,
        CONSTRAINT "PK_payment_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_orders_orderNo" UNIQUE ("orderNo"),
        CONSTRAINT "FK_payment_orders_merchant" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_payment_orders_status" ON "payment_orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_orders_expireAt" ON "payment_orders" ("expireAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_orders_externalOrderNo" ON "payment_orders" ("externalOrderNo")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_orders_merchantId" ON "payment_orders" ("merchantId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_orders_merchant_createdAt" ON "payment_orders" ("merchantId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_payment_orders_merchant_status" ON "payment_orders" ("merchantId", "status")`);

    // ---- notify_queues ----
    await queryRunner.query(`
      CREATE TABLE "notify_queues" (
        "id" BIGSERIAL PRIMARY KEY,
        "orderNo" varchar(64) NULL,
        "url" varchar(512) NOT NULL,
        "body" text NOT NULL,
        "signature" text NOT NULL,
        "retryCount" int NOT NULL DEFAULT 0,
        "status" int NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "lastAttemptAt" TIMESTAMP NULL,
        "lastError" text NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_notify_queues_orderNo" ON "notify_queues" ("orderNo")`);
    await queryRunner.query(`CREATE INDEX "IDX_notify_queues_status" ON "notify_queues" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_notify_queues_createdAt" ON "notify_queues" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_notify_queues_lastAttemptAt" ON "notify_queues" ("lastAttemptAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_notify_queues_status_createdAt" ON "notify_queues" ("status", "createdAt")`);

    // ---- reconciliation_records ----
    await queryRunner.query(`
      CREATE TABLE "reconciliation_records" (
        "id" BIGSERIAL PRIMARY KEY,
        "provider" varchar(32) NOT NULL,
        "billDate" date NOT NULL,
        "orderNo" varchar(64) NULL,
        "upstreamTradeNo" varchar(128) NULL,
        "upstreamAmount" decimal(18,2) NOT NULL DEFAULT 0,
        "localAmount" decimal(18,2) NOT NULL DEFAULT 0,
        "upstreamFee" decimal(18,2) NOT NULL DEFAULT 0,
        "status" varchar(32) NOT NULL,
        "note" text NULL,
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_recon_provider_bill_trade" UNIQUE ("provider", "billDate", "upstreamTradeNo")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_recon_provider" ON "reconciliation_records" ("provider")`);
    await queryRunner.query(`CREATE INDEX "IDX_recon_billDate" ON "reconciliation_records" ("billDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_recon_orderNo" ON "reconciliation_records" ("orderNo")`);
    await queryRunner.query(`CREATE INDEX "IDX_recon_status" ON "reconciliation_records" ("status")`);

    // ---- audit_logs ----
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "action" varchar(64) NOT NULL,
        "actor" varchar(128) NOT NULL,
        "targetType" varchar(32) NULL,
        "targetId" varchar(128) NULL,
        "ip" varchar(64) NULL,
        "detail" text NULL,
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_actor" ON "audit_logs" ("actor")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_targetId" ON "audit_logs" ("targetId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_createdAt" ON "audit_logs" ("createdAt")`);

    // ---- site_settings ----
    await queryRunner.query(`
      CREATE TABLE "site_settings" (
        "key" varchar(128) NOT NULL,
        "value" text NOT NULL,
        "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_site_settings" PRIMARY KEY ("key")
      )
    `);

    // ---- nonce_records ----
    await queryRunner.query(`
      CREATE TABLE "nonce_records" (
        "nonce" varchar(255) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_nonce_records" PRIMARY KEY ("nonce")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_nonce_expiresAt" ON "nonce_records" ("nonce", "expiresAt")`);

    // ---- typeorm_migrations ----
    await queryRunner.query(`
      CREATE TABLE "typeorm_migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" bigint NOT NULL,
        "name" varchar(255) NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "typeorm_migrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nonce_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reconciliation_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notify_queues"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "merchants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
