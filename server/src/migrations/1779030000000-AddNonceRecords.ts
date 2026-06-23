import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNonceRecords1779030000000 implements MigrationInterface {
  name = 'AddNonceRecords1779030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`nonce_records\` (
        \`nonce\` varchar(255) NOT NULL,
        \`expiresAt\` timestamp NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`nonce\`),
        INDEX \`IDX_nonce_expiresAt\` (\`nonce\`, \`expiresAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `nonce_records`');
  }
}
