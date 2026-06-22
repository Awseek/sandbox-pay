import { Injectable, Logger, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jose from 'jose';

/** JWKS 缓存 */
interface JwksCache {
  keys: Record<string, unknown>[];
  fetchedAt: number;
}

/** SSO Token 响应 */
interface SsoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
}

/** ID Token Claims */
export interface IdTokenClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时
const STATE_TTL_MS = 10 * 60 * 1000; // 10 分钟

@Injectable()
export class SsoClientService implements OnModuleInit {
  private readonly logger = new Logger(SsoClientService.name);

  private ssoBaseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private clientUrl: string;

  /** JWKS 缓存 */
  private jwksCache: JwksCache | null = null;

  /** State 存储（生产环境应存 Redis） */
  private stateStore = new Map<string, { codeVerifier: string; nonce?: string; expiresAt: number }>();

  constructor(private configService: ConfigService) {
    this.ssoBaseUrl = this.configService.get<string>('SSO_BASE_URL', 'https://we29.cn');
    this.clientId = this.configService.get<string>('SSO_CLIENT_ID', 'wei_pay');
    this.clientSecret = this.configService.get<string>('SSO_CLIENT_SECRET', '');
    this.clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:5173');
    this.redirectUri = `${this.clientUrl}/v1/api/auth/sso/callback`;
  }

  onModuleInit() {
    // 启动时预热 JWKS
    this.fetchJwks().catch((err) => this.logger.warn('Failed to prefetch JWKS', err));

    // 定期清理过期 state
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.stateStore) {
        if (value.expiresAt < now) this.stateStore.delete(key);
      }
    }, 60_000);
  }

  /**
   * 生成 SSO 授权 URL（带 PKCE）
   * 返回 { url, state } — 前端用 url 跳转，state 存 cookie 待回调验证
   */
  async generateAuthorizationUrl(): Promise<{ url: string; state: string }> {
    // PKCE: 生成 code_verifier 和 code_challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // 生成 state（防 CSRF）
    const state = crypto.randomBytes(16).toString('hex');

    // 存储 state → code_verifier 映射
    this.stateStore.set(state, {
      codeVerifier,
      expiresAt: Date.now() + STATE_TTL_MS,
    });

    // 构建授权 URL
    const url = new URL(`${this.ssoBaseUrl}/api/sso/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('scope', 'openid profile email');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { url: url.toString(), state };
  }

  /**
   * 处理 SSO 回调（行业标准流程）
   * 1. 验证 state 防 CSRF
   * 2. 用 code + code_verifier 换 token
   * 3. 验证 ID Token 签名（JWKS）
   * 4. 验证 ID Token claims（iss, aud, exp）
   * 5. 返回用户信息
   */
  async handleCallback(code: string, state: string): Promise<{
    user: IdTokenClaims;
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
  }> {
    // 1. 验证 state
    const stateData = this.stateStore.get(state);
    if (!stateData) {
      throw new UnauthorizedException('无效或过期的 state 参数');
    }
    this.stateStore.delete(state);

    // 2. 用 code + code_verifier 换 token
    const tokenResponse = await this.exchangeCode(code, stateData.codeVerifier);

    // 3. 验证 ID Token
    let idTokenClaims: IdTokenClaims | null = null;
    if (tokenResponse.id_token) {
      idTokenClaims = await this.verifyIdToken(tokenResponse.id_token);
    }

    // 如果没有 ID Token，用 access_token 调 userinfo（降级方案）
    if (!idTokenClaims) {
      const userinfo = await this.fetchUserinfo(tokenResponse.access_token);
      idTokenClaims = userinfo;
    }

    return {
      user: idTokenClaims,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      idToken: tokenResponse.id_token,
    };
  }

  /**
   * 刷新 SSO token
   */
  async refreshTokens(refreshToken: string): Promise<SsoTokenResponse> {
    const res = await fetch(`${this.ssoBaseUrl}/api/sso/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
      }),
    });

    if (!res.ok) {
      throw new UnauthorizedException('SSO token 刷新失败');
    }

    return res.json() as Promise<SsoTokenResponse>;
  }

  /**
   * 撤销 SSO token（单点登出用）
   */
  async revokeToken(token: string, tokenTypeHint?: string): Promise<void> {
    await fetch(`${this.ssoBaseUrl}/api/sso/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token,
        token_type_hint: tokenTypeHint || 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
  }

  /**
   * 验证 SSO 会话是否有效
   */
  async checkSession(refreshToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.ssoBaseUrl}/api/sso/session/check`, {
        headers: { Cookie: `sso_refresh_token=${refreshToken}` },
        credentials: 'include',
      });
      const data = (await res.json()) as { valid: boolean };
      return data.valid;
    } catch {
      return false;
    }
  }

  // ===== 私有方法 =====

  /** 用授权码换 token */
  private async exchangeCode(code: string, codeVerifier: string): Promise<SsoTokenResponse> {
    const res = await fetch(`${this.ssoBaseUrl}/api/sso/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error('SSO token exchange failed:', errText);
      throw new UnauthorizedException('SSO 授权码交换失败');
    }

    return res.json() as Promise<SsoTokenResponse>;
  }

  /** 验证 ID Token（行业标准） */
  private async verifyIdToken(idToken: string): Promise<IdTokenClaims> {
    // 获取 JWKS
    const jwks = await this.fetchJwks();

    // 验证签名
    let payload: Record<string, unknown>;
    try {
      const result = await jose.jwtVerify(idToken, jose.createLocalJWKSet(jwks as any), {
        issuer: this.ssoBaseUrl.replace(/\/+$/, ''),
        audience: this.clientId,
      });
      payload = result.payload as Record<string, unknown>;
    } catch (err) {
      this.logger.error('ID Token verification failed', err);
      throw new UnauthorizedException('ID Token 验证失败');
    }

    // 验证必需 claims
    if (!payload.sub) {
      throw new UnauthorizedException('ID Token 缺少 sub claim');
    }

    return payload as unknown as IdTokenClaims;
  }

  /** 获取 JWKS（带缓存） */
  private async fetchJwks() {
    if (this.jwksCache && Date.now() - this.jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
      return { keys: this.jwksCache.keys };
    }

    const res = await fetch(`${this.ssoBaseUrl}/api/.well-known/jwks.json`);
    if (!res.ok) {
      throw new Error('Failed to fetch JWKS');
    }

    const jwks = (await res.json()) as { keys: Record<string, unknown>[] };
    this.jwksCache = { keys: jwks.keys, fetchedAt: Date.now() };

    return jwks;
  }

  /** 获取 userinfo（降级方案） */
  private async fetchUserinfo(accessToken: string): Promise<IdTokenClaims> {
    const res = await fetch(`${this.ssoBaseUrl}/api/sso/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new UnauthorizedException('获取用户信息失败');
    }

    return res.json() as Promise<IdTokenClaims>;
  }

  /** 生成 PKCE code_verifier (43-128 字符) */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /** 生成 PKCE code_challenge (S256) */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }
}
