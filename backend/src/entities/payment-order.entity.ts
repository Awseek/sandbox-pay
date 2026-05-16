import {
  Entity, PrimaryColumn, Column, CreateDateColumn,
  Index, ManyToOne, JoinColumn, UpdateDateColumn,
} from 'typeorm';
import { Merchant } from './merchant.entity';

export enum OrderStatus {
  Expired = -1,
  Pending = 0,
  Paid = 1,
  Failed = 2,
}

@Entity('payment_orders')
@Index(['merchantId', 'status'])
@Index(['merchantId', 'createdAt'])
export class PaymentOrder {
  @PrimaryColumn({ length: 32 })
  id: string;

  @Column({ length: 64, unique: true })
  @Index()
  orderNo: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column()
  productName: string;

  @Column({ length: 32 })
  payMethod: string;

  @Column({ type: 'int', default: OrderStatus.Pending })
  @Index()
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp' })
  @Index()
  expireAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  payAt?: Date;

  @Column({ type: 'decimal', precision: 18, scale: 10, nullable: true })
  exchangeRate?: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  foreignAmount?: number;

  @Column({ length: 10, nullable: true })
  foreignCurrency?: string;

  @Column({ length: 64, nullable: true })
  @Index()
  externalOrderNo?: string;

  @Column({ length: 128, nullable: true })
  thirdPartyTradeNo?: string;

  @Column({ length: 512, nullable: true })
  returnUrl?: string;

  @Column({ length: 512, nullable: true })
  notifyUrl?: string;

  @Column({ nullable: true })
  @Index('IDX_2b556e814d00821714c8eb132b')
  merchantId?: number;

  @Column({ name: 'userId', default: 1 })
  userId: number;

  @ManyToOne(() => Merchant, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'merchantId' })
  merchant?: Merchant;
}
