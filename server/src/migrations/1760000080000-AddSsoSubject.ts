import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSsoSubject1760000080000 implements MigrationInterface {
  name = 'AddSsoSubject1760000080000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `users` ADD COLUMN `ssoSubject` varchar(36) NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_users_ssoSubject` ON `users` (`ssoSubject`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_users_ssoSubject` ON `users`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN `ssoSubject`');
  }
}
