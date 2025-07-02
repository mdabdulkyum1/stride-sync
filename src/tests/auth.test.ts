import request from 'supertest';
import app from '../app';

describe('Auth Routes', () => {
  it('should return 200 for Strava login', async () => {
    const res = await request(app).get('/auth/strava');
    expect(res.status).toBe(200);
  });
});