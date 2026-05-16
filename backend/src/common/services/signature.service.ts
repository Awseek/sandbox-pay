import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class SignatureService {
  sign(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .toLowerCase();
  }

  verify(payload: string, secret: string, signature: string): boolean {
    return this.sign(payload, secret) === signature;
  }

  buildPayload(body: string, timestamp: string, nonce: string): string {
    return `${body}&timestamp=${timestamp}&nonce=${nonce}`;
  }
}
