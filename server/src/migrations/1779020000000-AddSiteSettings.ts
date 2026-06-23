import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteSettings1779020000000 implements MigrationInterface {
  name = 'AddSiteSettings1779020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`site_settings\` (
        \`key\` varchar(128) NOT NULL,
        \`value\` text NOT NULL,
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `site_settings`');
  }
}
