import express from 'express';
import request from 'supertest';
import { basicAuth } from './basic-auth-middleware';

describe('basicAuth', () => {
  const app = express();
  app.use(basicAuth({ username: 'reader', password: 's3cret' }));
  app.all(/.*/, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  it('allows requests with valid credentials', async () => {
    const response = await request(app).get('/api/books').auth('reader', 's3cret');

    expect(response.status).toBe(200);
  });

  it('rejects requests without credentials and prompts the browser', async () => {
    const response = await request(app).get('/api/books');

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Basic realm="KoInsight", charset="UTF-8"');
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('rejects a wrong password', async () => {
    const response = await request(app).get('/api/books').auth('reader', 'wrong');

    expect(response.status).toBe(401);
  });

  it('rejects a wrong username', async () => {
    const response = await request(app).get('/api/books').auth('someone', 's3cret');

    expect(response.status).toBe(401);
  });

  it('rejects a malformed authorization header', async () => {
    const response = await request(app)
      .get('/api/books')
      .set('Authorization', 'Basic bm9jb2xvbg==');

    expect(response.status).toBe(401);
  });

  it('allows passwords containing colons', async () => {
    const colonApp = express();
    colonApp.use(basicAuth({ username: 'reader', password: 'a:b:c' }));
    colonApp.get('/', (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(colonApp).get('/').auth('reader', 'a:b:c');

    expect(response.status).toBe(200);
  });

  it('protects the web UI and plugin upload endpoints', async () => {
    for (const path of ['/', '/api/plugin/import', '/api/plugin/download']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
    }
  });

  it.each([
    ['GET', '/users/auth'],
    ['PUT', '/syncs/progress'],
    ['GET', '/syncs/progress/abc123'],
  ])('leaves self-authenticated KoSync endpoint %s %s open', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'put'](path);

    expect(response.status).toBe(200);
  });

  it.each([
    ['POST', '/users/create'],
    ['GET', '/syncs/progress'],
  ])('protects KoSync endpoint %s %s that has no auth of its own', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post'](path);

    expect(response.status).toBe(401);
  });
});
