import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get total amount, success count and routing stats' })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get list of real payment orders' })
  async getTransactions() {
    return this.adminService.getTransactions();
  }

  @Get('merchant')
  @ApiOperation({ summary: 'Get active merchant credentials' })
  async getMerchant() {
    return this.adminService.getMerchant();
  }

  @Post('merchant/reset-secret')
  @ApiOperation({ summary: 'Reset merchant appSecret' })
  async resetSecret() {
    return this.adminService.resetSecret();
  }
}
