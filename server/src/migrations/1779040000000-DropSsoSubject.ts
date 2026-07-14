import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSsoSubject1779040000000 implements MigrationInterface {
  name = 'DropSsoSubject1779040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS `IDX_users_ssoSubject` ON `users`');
    await queryRunner.query('ALTER TABLE `users` DROP COLUMN IF EXISTS `ssoSubject`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `users` ADD COLUMN `ssoSubject` varchar(36) NULL',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_users_ssoSubject` ON `users` (`ssoSubject`)',
    );
  }
}
