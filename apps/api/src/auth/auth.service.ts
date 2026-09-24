import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { adminEmails, type Env } from '../config/env.validation';
import type { OwnerUser } from './auth.types';

/** Identity only — no other Google scopes. */
const SCOPES = ['openid', 'email', 'profile'];

export interface GoogleIdentity {
  email: string;
  name: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private client?: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  consentUrl(state: string): string {
    return this.oauth().generateAuthUrl({
      scope: SCOPES,
      state,
      prompt: 'select_account',
      include_granted_scopes: false,
    });
  }

  /** Exchange the callback code and verify the id_token against our client id. */
  async identityFromCode(code: string): Promise<GoogleIdentity> {
    const client = this.oauth();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) throw new UnauthorizedException('Google returned no id_token');

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
    });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) {
      throw new UnauthorizedException('Google account without a verified e-mail');
    }
    return { email: payload.email.toLowerCase(), name: payload.name ?? null };
  }

  /** The allowlist is the environment (decision 2026-09-22): a second owner is an env edit. */
  isAllowlisted(email: string): boolean {
    const list = this.config.get('ADMIN_EMAILS', { infer: true }) ?? '';
    return adminEmails({ ADMIN_EMAILS: list }).includes(email.toLowerCase());
  }

  /**
   * JIT upsert on a successful allowlisted sign-in: the row is created on the first login and
   * carries the FKs afterwards. A row switched to `isActive = false` refuses the sign-in even
   * while the e-mail is still in the env — the env admits, the row can ban.
   */
  async signInOwner(identity: GoogleIdentity): Promise<OwnerUser | null> {
    const email = identity.email.toLowerCase();
    if (!this.isAllowlisted(email)) {
      this.logger.warn('Rejected sign-in for a non-allowlisted Google account');
      return null;
    }
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });
    if (existing && !existing.isActive) {
      this.logger.warn(`Rejected sign-in for a deactivated owner (${email})`);
      return null;
    }
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email, name: identity.name, lastLoginAt: new Date() },
      // Google is the source of the display name; keep ours when Google has none.
      update: { lastLoginAt: new Date(), ...(identity.name ? { name: identity.name } : {}) },
      select: { id: true, email: true, name: true, role: true },
    });
    return user;
  }

  /** The AUTH_DEV_USER hatch: same JIT rule, no Google. Never reached in production. */
  async devOwner(email: string): Promise<OwnerUser | null> {
    const lower = email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: lower },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    if (existing) return existing.isActive ? existing : null;
    return this.prisma.user.create({
      data: { email: lower, name: 'Dev owner' },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  /** False until the Google Cloud credentials are in the environment. */
  get isConfigured(): boolean {
    return Boolean(
      this.config.get('GOOGLE_CLIENT_ID', { infer: true }) &&
      this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
    );
  }

  get isProduction(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  get webUrl(): string {
    return this.config.get('WEB_URL', { infer: true });
  }

  private oauth(): OAuth2Client {
    if (!this.client) {
      const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
      const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', { infer: true });
      if (!clientId || !clientSecret) {
        throw new UnauthorizedException(
          'Google sign-in is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
        );
      }
      this.client = new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri: this.config.get('GOOGLE_REDIRECT_URI', { infer: true }),
      });
    }
    return this.client;
  }
}
