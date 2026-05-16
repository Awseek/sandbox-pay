import { IsString, IsNumber, IsOptional, Min, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Test Product' })
  @IsString()
  productName: string;

  @ApiProperty({ example: 'alipay', description: 'Payment method: alipay, paypal, native' })
  @IsString()
  payMethod: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  externalOrderNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  notifyUrl?: string;
}
