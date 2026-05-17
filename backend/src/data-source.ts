import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { User } from './entities/user.entity';
import { Merchant } from './entities/merchant.entity';
import { PaymentOrder } from './entities/payment-order.entity';
import { NotifyQueue } from './entities/notify-queue.entity';
import { ReconciliationRecord } from './entities/reconciliation-record.entity';
import { AuditLog } from './entities/audit-log.entity';

// Used by the TypeORM CLI for generating / running migrations.
// `dotenv` is bundled transitively via @nestjs/config; required at runtime to
// avoid adding a top-level dependency. The CLI runs before Nest bootstraps, so
// we have to load `.env` ourselves here.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv not present — assume env vars are already set in the shell.
}

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'wepay_db',
  entities: [User, Merchant, PaymentOrder, NotifyQueue, ReconciliationRecord, AuditLog],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
});
