import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthMe } from '@bugbot/shared';
import { HistoryService } from '../common/history.service';
import { CurrentOwner, Public } from './auth.decorators';
import { AuthService } from './auth.service';
import { OAUTH_STATE_COOKIE, OWNER_SESSION_COOKIE } from './auth.types';
import { OwnerSessionService } from './owner-session.service';
import { randomToken } from './token';

const STATE_TTL_MS = 10 * 60 * 1000;

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: OwnerSessionService,
    private readonly history: HistoryService,
  ) {}

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Start the Google sign-in redirect' })
  start(@Res() res: Response): void {
    // Without credentials the click would end on a raw JSON 401 — say so on the login page.
    if (!this.auth.isConfigured) return this.fail(res, 'not_configured');

    const state = randomToken();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.sessions.cookieOptions(this.auth.isProduction, STATE_TTL_MS),
      signed: true,
    });
    res.redirect(this.auth.consentUrl(state));
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google redirects back here with a code' })
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ): Promise<void> {
    const expected = (req.signedCookies as Record<string, string> | undefined)?.[
      OAUTH_STATE_COOKIE
    ];
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    // A missing, unsigned or mismatched state means the flow did not start here.
    if (!code || !state || !expected || state !== expected) {
      throw new BadRequestException('Invalid OAuth state');
    }

    let identity;
    try {
      identity = await this.auth.identityFromCode(code);
    } catch {
      return this.fail(res, 'google_error');
    }

    const owner = await this.auth.signInOwner(identity);
    if (!owner) return this.fail(res, 'not_allowed');

    const session = await this.sessions.create(owner.id, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    await this.history.record({
      actor: { ownerId: owner.id },
      operation: 'OWNER_LOGIN',
      entityType: 'User',
      entityId: owner.id,
      payload: { sessionId: session.id },
    });

    res.cookie(
      OWNER_SESSION_COOKIE,
      session.id,
      this.sessions.cookieOptions(this.auth.isProduction),
    );
    res.redirect(`${this.auth.webUrl}/admin`);
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in owner (401 without a session)' })
  me(@CurrentOwner() owner: AuthMe): AuthMe {
    return owner;
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the session server-side and clear the cookie' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const sessionId = (req.cookies as Record<string, string> | undefined)?.[OWNER_SESSION_COOKIE];
    if (sessionId) await this.sessions.destroy(sessionId);
    res.clearCookie(OWNER_SESSION_COOKIE, { path: '/' });
    res.status(204).send();
  }

  private fail(res: Response, error: string): void {
    res.redirect(`${this.auth.webUrl}/login?error=${error}`);
  }
}
