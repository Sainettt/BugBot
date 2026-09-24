import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { OWNER_SESSION_TTL_MS } from '../src/auth/owner-session.service';
import {
  DEV_OWNER_EMAIL,
  SECOND_OWNER_EMAIL,
  createTestApp,
  resetDb,
  seedFixtures,
  signIn,
} from './harness';

/** Boots without the AUTH_DEV_USER hatch, so unauthenticated means unauthenticated. */
describe('Auth (owner sessions, Google callback, guard)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp({ devUser: null }));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await seedFixtures(prisma);
    jest.restoreAllMocks();
  });

  const http = () => request(app.getHttpServer());

  /** Walk the consent redirect to obtain the signed state cookie and the state value inside it. */
  async function startFlow(): Promise<{ cookie: string; state: string }> {
    const res = await http().get('/auth/google').expect(302);
    expect(res.headers.location).toContain('accounts.google.com');
    const setCookie = [res.headers['set-cookie']].flat().find((c) => c.startsWith('oauth_state='))!;
    const cookie = setCookie.split(';')[0];
    // cookie-parser signs as `s:<value>.<signature>`, URL-encoded in the header.
    const raw = decodeURIComponent(cookie.slice('oauth_state='.length));
    expect(raw.startsWith('s:')).toBe(true);
    const state = raw.slice(2).split('.')[0];
    return { cookie, state };
  }

  describe('public vs guarded', () => {
    it('leaves /health open and guards the cabinet', async () => {
      await http().get('/health').expect(200);
      await http().get('/admin/dashboard').expect(401);
      await http().get('/admin/reports').expect(401);
      await http().get('/auth/me').expect(401);
    });

    it('rejects a mutation coming from a foreign origin', async () => {
      const { cookie, sessionId } = await signIn(prisma);
      await http()
        .post('/auth/logout')
        .set('Cookie', cookie)
        .set('Origin', 'http://evil.example')
        .expect(403);
      expect(await prisma.ownerSession.findUnique({ where: { id: sessionId } })).not.toBeNull();
    });
  });

  describe('AUTH_DEV_USER hatch', () => {
    it('acts as the dev owner without a cookie and creates the row on first use', async () => {
      const hatch = await createTestApp();
      try {
        const me = await request(hatch.app.getHttpServer()).get('/auth/me').expect(200);
        expect(me.body).toMatchObject({ email: DEV_OWNER_EMAIL, role: 'OWNER' });
        expect(await prisma.user.count({ where: { email: DEV_OWNER_EMAIL } })).toBe(1);
        await request(hatch.app.getHttpServer()).get('/admin/dashboard').expect(200);
      } finally {
        await hatch.app.close();
      }
    });
  });

  describe('session lifecycle', () => {
    it('serves /auth/me and logs out server-side', async () => {
      const { cookie, sessionId, userId } = await signIn(prisma);

      const me = await http().get('/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body).toMatchObject({ id: userId, email: SECOND_OWNER_EMAIL, role: 'OWNER' });

      await http().post('/auth/logout').set('Cookie', cookie).expect(204);
      expect(await prisma.ownerSession.findUnique({ where: { id: sessionId } })).toBeNull();
      await http().get('/auth/me').set('Cookie', cookie).expect(401);
    });

    it('drops an expired session and a deactivated owner', async () => {
      const expired = await signIn(prisma, { expiresAt: new Date(Date.now() - 1000) });
      await http().get('/auth/me').set('Cookie', expired.cookie).expect(401);
      expect(await prisma.ownerSession.findUnique({ where: { id: expired.sessionId } })).toBeNull();

      const banned = await signIn(prisma, { email: 'banned@bugbot.test', isActive: false });
      await http().get('/auth/me').set('Cookie', banned.cookie).expect(401);
    });

    it('renews a session past half-life', async () => {
      const { cookie, sessionId } = await signIn(prisma, {
        expiresAt: new Date(Date.now() + OWNER_SESSION_TTL_MS / 4),
      });
      await http().get('/auth/me').set('Cookie', cookie).expect(200);
      const row = await prisma.ownerSession.findUniqueOrThrow({ where: { id: sessionId } });
      expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + OWNER_SESSION_TTL_MS / 2);
    });
  });

  describe('Google callback', () => {
    it('refuses a missing or mismatched state with 400', async () => {
      await http().get('/auth/google/callback?code=x&state=y').expect(400);
      const { cookie } = await startFlow();
      await http()
        .get('/auth/google/callback?code=x&state=wrong')
        .set('Cookie', cookie)
        .expect(400);
      // An unsigned cookie with the right value is not our cookie either.
      await http()
        .get('/auth/google/callback?code=x&state=abc')
        .set('Cookie', 'oauth_state=abc')
        .expect(400);
    });

    it('signs an allowlisted account in: JIT user, session cookie, history event, redirect to /admin', async () => {
      jest
        .spyOn(app.get(AuthService), 'identityFromCode')
        .mockResolvedValue({ email: 'Owner@BugBot.test', name: 'Owner Two' });
      const { cookie, state } = await startFlow();

      const res = await http()
        .get(`/auth/google/callback?code=good&state=${state}`)
        .set('Cookie', cookie)
        .expect(302);
      expect(res.headers.location).toBe('http://localhost:3100/admin');
      const osid = [res.headers['set-cookie']].flat().find((c) => c.startsWith('osid='))!;
      expect(osid).toContain('HttpOnly');
      const sessionId = decodeURIComponent(osid.split(';')[0].slice('osid='.length));

      const user = await prisma.user.findUniqueOrThrow({ where: { email: SECOND_OWNER_EMAIL } });
      expect(user.name).toBe('Owner Two');
      expect(user.lastLoginAt).not.toBeNull();
      expect(await prisma.ownerSession.findUnique({ where: { id: sessionId } })).toMatchObject({
        userId: user.id,
      });
      expect(
        await prisma.historyEvent.findFirst({
          where: { operation: 'OWNER_LOGIN', entityId: user.id },
        }),
      ).toMatchObject({ actorUserId: user.id, actorProjectUserId: null });

      await http().get('/auth/me').set('Cookie', `osid=${sessionId}`).expect(200);
    });

    it('refuses a non-allowlisted account without creating anything', async () => {
      jest
        .spyOn(app.get(AuthService), 'identityFromCode')
        .mockResolvedValue({ email: 'stranger@example.com', name: 'Stranger' });
      const { cookie, state } = await startFlow();
      const before = await prisma.user.count();

      const res = await http()
        .get(`/auth/google/callback?code=good&state=${state}`)
        .set('Cookie', cookie)
        .expect(302);
      expect(res.headers.location).toBe('http://localhost:3100/login?error=not_allowed');
      expect(await prisma.user.count()).toBe(before);
      expect(await prisma.historyEvent.count({ where: { operation: 'OWNER_LOGIN' } })).toBe(0);
    });

    it('refuses a deactivated owner even though the e-mail is still allowlisted', async () => {
      await prisma.user.create({ data: { email: SECOND_OWNER_EMAIL, isActive: false } });
      jest
        .spyOn(app.get(AuthService), 'identityFromCode')
        .mockResolvedValue({ email: SECOND_OWNER_EMAIL, name: null });
      const { cookie, state } = await startFlow();

      const res = await http()
        .get(`/auth/google/callback?code=good&state=${state}`)
        .set('Cookie', cookie)
        .expect(302);
      expect(res.headers.location).toContain('error=not_allowed');
      expect(await prisma.ownerSession.count()).toBe(0);
    });

    it('turns a Google failure into the login page, not a 500', async () => {
      jest.spyOn(app.get(AuthService), 'identityFromCode').mockRejectedValue(new Error('boom'));
      const { cookie, state } = await startFlow();
      const res = await http()
        .get(`/auth/google/callback?code=bad&state=${state}`)
        .set('Cookie', cookie)
        .expect(302);
      expect(res.headers.location).toBe('http://localhost:3100/login?error=google_error');
    });
  });
});
