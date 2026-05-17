import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1779015494415 implements MigrationInterface {
    name = 'Init1779015494415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`username\` varchar(20) NOT NULL, \`password\` varchar(100) NOT NULL, \`role\` enum ('Admin', 'SuperAdmin') NOT NULL DEFAULT 'Admin', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`merchants\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`appKey\` varchar(255) NOT NULL, \`appSecret\` varchar(255) NOT NULL, \`isActive\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_33b8e268c30e9bda1b93e3a84a\` (\`appKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`payment_orders\` (\`id\` varchar(32) NOT NULL, \`orderNo\` varchar(64) NOT NULL, \`amount\` decimal(18,2) NOT NULL, \`productName\` varchar(255) NOT NULL, \`payMethod\` varchar(32) NOT NULL, \`status\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`expireAt\` timestamp NOT NULL, \`payAt\` timestamp NULL, \`exchangeRate\` decimal(18,10) NULL, \`foreignAmount\` decimal(18,2) NULL, \`foreignCurrency\` varchar(10) NULL, \`externalOrderNo\` varchar(64) NULL, \`thirdPartyTradeNo\` varchar(128) NULL, \`refundedAmount\` decimal(18,2) NOT NULL DEFAULT '0.00', \`refundTradeNo\` varchar(128) NULL, \`refundAt\` timestamp NULL, \`channelCost\` decimal(18,2) NOT NULL DEFAULT '0.00', \`fee\` decimal(18,2) NOT NULL DEFAULT '0.00', \`settleAmount\` decimal(18,2) NOT NULL DEFAULT '0.00', \`returnUrl\` varchar(512) NULL, \`notifyUrl\` varchar(512) NULL, \`merchantId\` int NULL, \`userId\` int NOT NULL DEFAULT '1', INDEX \`IDX_8647dcb35fbdcdefdf329a24d1\` (\`status\`), INDEX \`IDX_41271b2e716e5958b8c1711798\` (\`expireAt\`), INDEX \`IDX_e905b9d7d010e7bcda24f8f03d\` (\`externalOrderNo\`), INDEX \`IDX_d2edb31d314bc7351455bdd8ff\` (\`merchantId\`), INDEX \`IDX_49b1fce625361e1a6bd8f54a17\` (\`merchantId\`, \`createdAt\`), INDEX \`IDX_e67cbcda4793f26ad044732ed1\` (\`merchantId\`, \`status\`), UNIQUE INDEX \`IDX_2b556e814d00821714c8eb132b\` (\`orderNo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notify_queues\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`orderNo\` varchar(64) NULL, \`url\` varchar(512) NOT NULL, \`body\` text NOT NULL, \`signature\` text NOT NULL, \`retryCount\` int NOT NULL DEFAULT '0', \`status\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`lastAttemptAt\` timestamp NULL, \`lastError\` text NULL, INDEX \`IDX_99fe3afcc30545000b65a3b462\` (\`orderNo\`), INDEX \`IDX_aab6680b414042722deeb95feb\` (\`status\`), INDEX \`IDX_d525bbdac284afc9420f5b8353\` (\`createdAt\`), INDEX \`IDX_1ca818007b87955795db947107\` (\`lastAttemptAt\`), INDEX \`IDX_ab1b1350e50e695206ffca1e0b\` (\`status\`, \`createdAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`reconciliation_records\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`provider\` varchar(32) NOT NULL, \`billDate\` date NOT NULL, \`orderNo\` varchar(64) NULL, \`upstreamTradeNo\` varchar(128) NULL, \`upstreamAmount\` decimal(18,2) NOT NULL DEFAULT '0.00', \`localAmount\` decimal(18,2) NOT NULL DEFAULT '0.00', \`upstreamFee\` decimal(18,2) NOT NULL DEFAULT '0.00', \`status\` varchar(32) NOT NULL, \`note\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_fab601469ad62dae71f5191eb4\` (\`provider\`), INDEX \`IDX_4254a766c43ba4142e08de4f66\` (\`billDate\`), INDEX \`IDX_a8ea1ffd5e6c0b4d45e8c96474\` (\`orderNo\`), INDEX \`IDX_22efa0472c59f14bc5af003fa7\` (\`status\`), UNIQUE INDEX \`IDX_c808a68583b7368a5ac8997759\` (\`provider\`, \`billDate\`, \`upstreamTradeNo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`payment_orders\` ADD CONSTRAINT \`FK_d2edb31d314bc7351455bdd8ffe\` FOREIGN KEY (\`merchantId\`) REFERENCES \`merchants\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`payment_orders\` DROP FOREIGN KEY \`FK_d2edb31d314bc7351455bdd8ffe\``);
        await queryRunner.query(`DROP INDEX \`IDX_c808a68583b7368a5ac8997759\` ON \`reconciliation_records\``);
        await queryRunner.query(`DROP INDEX \`IDX_22efa0472c59f14bc5af003fa7\` ON \`reconciliation_records\``);
        await queryRunner.query(`DROP INDEX \`IDX_a8ea1ffd5e6c0b4d45e8c96474\` ON \`reconciliation_records\``);
        await queryRunner.query(`DROP INDEX \`IDX_4254a766c43ba4142e08de4f66\` ON \`reconciliation_records\``);
        await queryRunner.query(`DROP INDEX \`IDX_fab601469ad62dae71f5191eb4\` ON \`reconciliation_records\``);
        await queryRunner.query(`DROP TABLE \`reconciliation_records\``);
        await queryRunner.query(`DROP INDEX \`IDX_ab1b1350e50e695206ffca1e0b\` ON \`notify_queues\``);
        await queryRunner.query(`DROP INDEX \`IDX_1ca818007b87955795db947107\` ON \`notify_queues\``);
        await queryRunner.query(`DROP INDEX \`IDX_d525bbdac284afc9420f5b8353\` ON \`notify_queues\``);
        await queryRunner.query(`DROP INDEX \`IDX_aab6680b414042722deeb95feb\` ON \`notify_queues\``);
        await queryRunner.query(`DROP INDEX \`IDX_99fe3afcc30545000b65a3b462\` ON \`notify_queues\``);
        await queryRunner.query(`DROP TABLE \`notify_queues\``);
        await queryRunner.query(`DROP INDEX \`IDX_2b556e814d00821714c8eb132b\` ON \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_e67cbcda4793f26ad044732ed1\` ON \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_49b1fce625361e1a6bd8f54a17\` ON \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_d2edb31d314bc7351455bdd8ff\` ON \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_e905b9d7d010e7bcda24f8f03d\` ON \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_41271b2e716e5958b8c1711798\` ON \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_8647dcb35fbdcdefdf329a24d1\` ON \`payment_orders\``);
        await queryRunner.query(`DROP TABLE \`payment_orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_33b8e268c30e9bda1b93e3a84a\` ON \`merchants\``);
        await queryRunner.query(`DROP TABLE \`merchants\``);
        await queryRunner.query(`DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
