import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../../entities/merchant.entity';
import { SignatureService } from '../../common/services/signature.service';

@Injectable()
export class MerchantSignatureGuard implements CanActivate {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private signatureService: SignatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const appKey = request.headers['x-weipay-appkey'];
    const timestamp = request.headers['x-weipay-timestamp'];
    const nonce = request.headers['x-weipay-nonce'];
    const signature = request.headers['x-weipay-signature'];

    if (!appKey || !timestamp || !nonce || !signature) {
      throw new UnauthorizedException('Missing security headers');
    }

    const merchant = await this.merchantRepository.findOne({
      where: { appKey, isActive: true },
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid AppKey or inactive merchant');
    }

    // Simple time check (5 minutes window)
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 300000) {
      throw new UnauthorizedException('Timestamp expired or invalid');
    }

    const bodyStr = request.method === 'GET' ? request.query.orderNo || '' : JSON.stringify(request.body);
    const payload = this.signatureService.buildPayload(bodyStr, timestamp, nonce);
    const isValid = this.signatureService.verify(payload, merchant.appSecret, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    request['merchant'] = merchant;
    return true;
  }
}
