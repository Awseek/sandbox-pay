import { Controller, Post, Body } from '@nestjs/common';
import { AlipayService } from '../gateways/alipay.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Alipay')
@Controller('api/alipay')
export class AlipayController {
  constructor(private alipayService: AlipayService) {}

  @Post('notify')
  @ApiOperation({ summary: 'Alipay async payment notification' })
  async handleNotify(@Body() body: any) {
    return this.alipayService.handleNotify(body);
  }
}
