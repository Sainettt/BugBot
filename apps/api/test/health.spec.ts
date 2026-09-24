import request from 'supertest';
import { createTestApp } from './harness';

describe('GET /health', () => {
  it('is public and reports database connectivity', async () => {
    const { app } = await createTestApp({ devUser: null });
    try {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toEqual({ ok: true, db: true });
    } finally {
      await app.close();
    }
  });
});
