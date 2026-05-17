import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Blocks access to sandbox / demo endpoints unless `ENABLE_SANDBOX=true`.
 *
 * Sandbox endpoints (test-pay, sandbox-confirm, etc.) MUST stay disabled in production
 * because they bypass merchant signature verification and can mark orders as paid.
 */
@Injectable()
export class SandboxGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const enabled = this.configService.get<string>('ENABLE_SANDBOX', 'false') === 'true';
    if (!enabled) {
      throw new ForbiddenException('Sandbox endpoints are disabled in this environment');
    }
    return true;
  }
}
