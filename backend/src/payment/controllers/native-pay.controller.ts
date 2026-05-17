import { Controller, Get, Post, Query, Body, UseGuards, Req, BadRequestException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { NativePayService } from '../gateways/native-pay.service';
import { AlipayService } from '../gateways/alipay.service';
import { PayPalService } from '../gateways/paypal.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SandboxGuard } from '../../common/guards/sandbox.guard';
import { errMessage, errStack } from '../../common/util/error';

@ApiTags('NativePay')
@Controller('api/native-pay')
export class NativePayController {
  private readonly logger = new Logger(NativePayController.name);

  constructor(
    private nativePayService: NativePayService,
    private alipayService: AlipayService,
    private paypalService: PayPalService,
  ) {}

  @Get('cashier')
  @ApiOperation({ summary: 'Get cashier page payment info for native pay' })
  async getCashierInfo(@Query('orderNo') orderNo: string) {
    return this.nativePayService.getCashierInfo(orderNo);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Admin manually confirm payment received' })
  async confirmPayment(
    @Body() body: { orderNo: string; tradeNo?: string; walletUser: string; walletPass: string },
  ) {
    return this.nativePayService.confirmPayment(
      body.orderNo,
      body.tradeNo,
      body.walletUser,
      body.walletPass,
    );
  }

  @Post('sandbox-confirm')
  @UseGuards(SandboxGuard)
  @ApiOperation({ summary: '[SANDBOX-ONLY] confirm payment for local testing (disabled in production)' })
  async sandboxConfirm(@Body() body: { orderNo: string; walletUser?: string; walletPass?: string }) {
    return this.nativePayService.confirmPayment(
      body.orderNo,
      'WP_WALLET_' + Date.now(),
      body.walletUser,
      body.walletPass,
    );
  }

  @Post('switch-channel')
  @ApiOperation({ summary: 'Directly invoke real payment gateways (Alipay / PayPal) from cashier' })
  async switchChannel(@Body() body: { orderNo: string; channel: 'alipay' | 'paypal' }, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    try {
      if (body.channel === 'alipay') {
        const res = await this.alipayService.createPagePay(body.orderNo, baseUrl);
        return { code: 200, data: res };
      } else if (body.channel === 'paypal') {
        const res = await this.paypalService.createOrder(body.orderNo, baseUrl);
        return { code: 200, data: res };
      }
      throw new BadRequestException('Unsupported payment channel');
    } catch (err: unknown) {
      const message = errMessage(err);
      this.logger.error(`Switch channel error: ${message}`, errStack(err));
      throw new BadRequestException(message || 'Gateway invocation failed');
    }
  }

}

