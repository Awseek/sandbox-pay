import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogs1779016547792 implements MigrationInterface {
    name = 'AddAuditLogs1779016547792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`audit_logs\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`action\` varchar(64) NOT NULL, \`actor\` varchar(128) NOT NULL, \`targetType\` varchar(32) NULL, \`targetId\` varchar(128) NULL, \`ip\` varchar(64) NULL, \`detail\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_cee5459245f652b75eb2759b4c\` (\`action\`), INDEX \`IDX_d4d7e8b3eb1b8dc93ba08fb535\` (\`actor\`), INDEX \`IDX_fcfb9137823075fb3162b82f73\` (\`targetId\`), INDEX \`IDX_c69efb19bf127c97e6740ad530\` (\`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_c69efb19bf127c97e6740ad530\` ON \`audit_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_fcfb9137823075fb3162b82f73\` ON \`audit_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_d4d7e8b3eb1b8dc93ba08fb535\` ON \`audit_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_cee5459245f652b75eb2759b4c\` ON \`audit_logs\``);
        await queryRunner.query(`DROP TABLE \`audit_logs\``);
    }

}
