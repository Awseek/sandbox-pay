import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReconciliationService } from './reconciliation.service';
import { ReconStatus } from '../entities/reconciliation-record.entity';
import { RefundService } from '../payment/services/refund.service';
import { PaymentService } from '../payment/services/payment.service';
import { NativePayService } from '../payment/gateways/native-pay.service';
import { AuditService } from '../common/services/audit.service';
import { RefundDto } from '../payment/dto/payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../common/types/express';
import { clientIp } from '../common/util/request';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reconciliationService: ReconciliationService,
    private readonly refundService: RefundService,
    private readonly paymentService: PaymentService,
    private readonly nativePayService: NativePayService,
    private readonly auditService: AuditService,
  ) {}

  /** Resolve a stable actor identifier from the JWT payload attached by `JwtAuthGuard`. */
  private actorOf(req: AuthenticatedRequest): string {
    const u = req?.user?.username || req?.user?.sub || 'admin';
    return `admin:${u}`;
  }


  @Get('stats')
  @ApiOperation({ summary: 'Get total amount, success count and routing stats' })
  @ApiQuery({ name: 'merchantId', required: false, type: Number })
  async getStats(@Query('merchantId') merchantId?: string) {
    return this.adminService.getStats(merchantId ? Number(merchantId) : undefined);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated payment orders' })
  @ApiQuery({ name: 'merchantId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getTransactions(
    @Query('merchantId') merchantId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getTransactions({
      merchantId: merchantId ? Number(merchantId) : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Delete('transactions/:orderNo')
  @ApiOperation({ summary: 'Delete a payment order by orderNo' })
  async deleteTransaction(@Param('orderNo') orderNo: string, @Req() req: AuthenticatedRequest) {
    return this.adminService.deleteTransaction(orderNo, this.actorOf(req), clientIp(req));
  }

  @Get('merchant')
  @ApiOperation({ summary: 'Get active merchant credentials' })
  async getMerchant() {
    return this.adminService.getMerchant();
  }

  @Post('merchant/reset-secret')
  @ApiOperation({ summary: 'Reset merchant appSecret' })
  async resetSecret(@Req() req: AuthenticatedRequest) {
    return this.adminService.resetSecret(this.actorOf(req), clientIp(req));
  }

  /**
   * Create a test order against the logged-in admin's active merchant and
   * return the native cashier URL. Replaces the public sandbox-only `/api/native-pay/test-pay`.
   */
  @Post('test-pay')
  @ApiOperation({ summary: 'Create a test order for the active merchant and return cashier URL' })
  async testPay(
    @Body() body: { amount?: number; productName?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const merchant = await this.adminService.findActiveMerchant();

    const amount = Number(body?.amount ?? 88.88);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    const productName = body?.productName?.trim() || 'WeiPay 测试订单';

    const orderResult = await this.paymentService.createOrder(merchant.id, {
      amount,
      productName,
      payMethod: 'native',
    });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.nativePayService.createOrder(orderResult.orderNo, baseUrl);
  }

  /**
   * Upload a daily bill CSV from an upstream PSP and reconcile against local
   * orders. The body is the raw CSV string; `provider` selects the parser.
   */
  @Post('reconciliation/upload')
  @ApiOperation({ summary: 'Upload a daily bill CSV and reconcile against local orders' })
  async uploadBill(@Body() body: { provider: 'alipay' | 'paypal'; billDate: string; csv: string }) {
    if (!body?.provider || !body?.billDate || !body?.csv) {
      throw new BadRequestException('provider, billDate, csv are required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.billDate)) {
      throw new BadRequestException('billDate must be YYYY-MM-DD');
    }
    const rows =
      body.provider === 'alipay'
        ? this.reconciliationService.parseAlipayCsv(body.csv)
        : this.reconciliationService.parsePayPalCsv(body.csv);
    return this.reconciliationService.reconcile(body.provider, body.billDate, rows);
  }

  /**
   * Admin-initiated refund. JWT-only (no merchant signature) so the dashboard
   * can refund directly. Delegates the full flow to {@link RefundService}
   * without a `merchantId` scope so any merchant's order can be refunded.
   */
  @Post('refund')
  @ApiOperation({ summary: 'Admin: refund a paid order (full or partial)' })
  async adminRefund(@Body() dto: RefundDto, @Req() req: AuthenticatedRequest) {
    return this.refundService.execute(dto, {
      actor: this.actorOf(req),
      ip: clientIp(req),
    });
  }

  @Get('reconciliation')
  @ApiOperation({ summary: 'List reconciliation records' })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'billDate', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ReconStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listReconciliation(
    @Query('provider') provider?: string,
    @Query('billDate') billDate?: string,
    @Query('status') status?: ReconStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.reconciliationService.list({
      provider,
      billDate,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'List sensitive-action audit log entries' })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'actor', required: false })
  @ApiQuery({ name: 'targetId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listAuditLogs(
    @Query('action') action?: string,
    @Query('actor') actor?: string,
    @Query('targetId') targetId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.auditService.list({
      action,
      actor,
      targetId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
