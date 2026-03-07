import { POST as loginPost } from '@/app/api/v1/auth/login/route';
import { POST as refreshPost } from '@/app/api/v1/auth/refresh/route';
import { NextRequest } from 'next/server';

describe('/api/v1/auth endpoints', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password: 'password123' }),
      });

      const res = await loginPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_EMAIL');
    });

    it('should return 400 if password is too short', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'short' }),
      });

      const res = await loginPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_PASSWORD');
    });

    it('should return 400 if JSON is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: 'invalid json',
      });

      const res = await loginPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_JSON');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return 400 if refresh_token is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const res = await refreshPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('MISSING_TOKEN');
    });

    it('should return 400 if JSON is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/refresh', {
        method: 'POST',
        body: 'invalid json',
      });

      const res = await refreshPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.code).toBe('INVALID_JSON');
    });
  });
});
