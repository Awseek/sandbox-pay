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
import { EncryptionService } from '../../common/services/encryption.service';
import { NonceStore } from '../../common/services/nonce-store.service';

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_TTL_MS = TIMESTAMP_WINDOW_MS + 60 * 1000; // window + small slack

@Injectable()
export class MerchantSignatureGuard implements CanActivate {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    private signatureService: SignatureService,
    private encryptionService: EncryptionService,
    private nonceStore: NonceStore,
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

    // Time window check (5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > TIMESTAMP_WINDOW_MS) {
      throw new UnauthorizedException('Timestamp expired or invalid');
    }

    // Replay protection: nonce must be unique within the time window, scoped per merchant
    const nonceKey = `${appKey}:${nonce}`;
    if (!this.nonceStore.tryConsume(nonceKey, NONCE_TTL_MS)) {
      throw new UnauthorizedException('Duplicate nonce — possible replay');
    }

    // Canonical payload: GET signs the sorted query string (excluding signature headers),
    // POST/PUT/DELETE sign the raw JSON body.
    const bodyStr =
      request.method === 'GET'
        ? this.signatureService.canonicalizeQuery(request.query)
        : JSON.stringify(request.body || {});

    const payload = this.signatureService.buildPayload(bodyStr, timestamp, nonce);
    const secret = this.encryptionService.decrypt(merchant.appSecret);
    const isValid = this.signatureService.verify(payload, secret, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    request['merchant'] = merchant;
    return true;
  }
}
