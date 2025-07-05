import request from 'supertest';
import express from 'express';
import { authRoutes } from '../app/modules/auth/auth.routes';
import { AuthService } from '../app/modules/auth/authService';
import { generateTokens, authenticateToken, requireRole } from '../app/middlewares/auth.middleware';
import config from '../app/config';
import jwt from 'jsonwebtoken';

// Mock Firebase
jest.mock('../app/config/firebase', () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    })),
  })),
}));

// Mock Strava API
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Auth Module Tests', () => {
  let authService: AuthService;
  let mockUser: any;
  let mockTokens: any;

  beforeEach(() => {
    authService = AuthService.getInstance();
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      stravaId: 'strava123',
      isActive: true,
      createdAt: Date.now(),
    };

    mockTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('AuthService', () => {
    describe('getAuthUrl', () => {
      it('should generate correct Strava OAuth URL', () => {
        const authUrl = authService.getAuthUrl();
        
        expect(authUrl).toContain('https://www.strava.com/oauth/authorize');
        expect(authUrl).toContain('client_id=');
        expect(authUrl).toContain('redirect_uri=');
        expect(authUrl).toContain('response_type=code');
        expect(authUrl).toContain('scope=read,activity:read_all');
      });
    });

    describe('getTokens', () => {
      it('should exchange code for tokens and create user', async () => {
        const mockStravaResponse = {
          data: {
            access_token: 'strava-access-token',
            refresh_token: 'strava-refresh-token',
            expires_at: Date.now() + 21600,
            athlete: {
              id: 123,
              firstname: 'Test',
              lastname: 'User',
              email: 'test@example.com',
            },
          },
        };

        const mockActivitiesResponse = {
          data: [
            {
              id: 1,
              name: 'Morning Run',
              type: 'Run',
              distance: 5000,
              moving_time: 1800,
              start_date: '2024-01-01T06:00:00Z',
            },
          ],
        };

        // Mock axios calls
        const axios = require('axios');
        axios.post
          .mockResolvedValueOnce(mockStravaResponse)
          .mockResolvedValueOnce({ data: mockActivitiesResponse.data });

        const result = await authService.getTokens('test-code');

        expect(result.user).toBeDefined();
        expect(result.tokens).toBeDefined();
        expect(result.user.stravaId).toBe('123');
        expect(result.user.email).toBe('test@example.com');
      });

      it('should handle Strava API errors', async () => {
        const axios = require('axios');
        axios.post.mockRejectedValue(new Error('Strava API error'));

        await expect(authService.getTokens('invalid-code')).rejects.toThrow('Failed to exchange code for tokens');
      });
    });


  });

  describe('Auth Middleware', () => {
    describe('generateTokens', () => {
      it('should generate valid JWT tokens', () => {
        const tokens = generateTokens(mockUser);

        expect(tokens.accessToken).toBeDefined();
        expect(tokens.refreshToken).toBeDefined();

        // Verify tokens can be decoded
        const decodedAccess = jwt.verify(tokens.accessToken, config.jwt.accessSecret as string);
        const decodedRefresh = jwt.verify(tokens.refreshToken, config.jwt.refreshSecret as string);

        expect(decodedAccess).toMatchObject({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        });
      });

      it('should throw error if JWT secrets not configured', () => {
        const originalSecret = config.jwt.accessSecret;
        (config.jwt as any).accessSecret = undefined;

        expect(() => generateTokens(mockUser)).toThrow('JWT secrets not configured');

        (config.jwt as any).accessSecret = originalSecret;
      });
    });

    describe('authenticateToken', () => {
      it('should authenticate valid token', async () => {
        const tokens = generateTokens(mockUser);
        const req: any = {
          headers: {
            authorization: `Bearer ${tokens.accessToken}`,
          },
        };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        // Mock Firebase user lookup
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => mockUser,
        });

        await authenticateToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(mockUser.id);
      });

      it('should reject request without token', async () => {
        const req: any = {
          headers: {},
        };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Access token is required',
          })
        );
      });

      it('should reject invalid token', async () => {
        const req: any = {
          headers: {
            authorization: 'Bearer invalid-token',
          },
        };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        await authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: 'Invalid token',
          })
        );
      });
    });

    describe('requireRole', () => {
      it('should allow access for user with required role', () => {
        const req: any = {
          user: { role: 'admin' },
        };
        const res: any = {};
        const next = jest.fn();

        const adminMiddleware = requireRole(['admin']);
        adminMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
      });

      it('should deny access for user without required role', () => {
        const req: any = {
          user: { role: 'user' },
        };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        const adminMiddleware = requireRole(['admin']);
        adminMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: expect.stringContaining('Access denied'),
          })
        );
      });
    });
  });

  describe('Auth Routes', () => {
    describe('GET /strava', () => {
      it('should redirect to Strava OAuth URL', async () => {
        const response = await request(app)
          .get('/api/v1/auth/strava')
          .expect(302);

        expect(response.headers.location).toContain('https://www.strava.com/oauth/authorize');
      });
    });

    describe('GET /callback', () => {
      it('should handle OAuth callback and redirect to dashboard', async () => {
        // Mock the auth service
        jest.spyOn(authService, 'getTokens').mockResolvedValue({
          user: mockUser,
          tokens: mockTokens,
        });

        const response = await request(app)
          .get('/api/v1/auth/callback?code=test-code')
          .expect(302);

        expect(response.headers.location).toContain('/dashboard.html');
        expect(response.headers.location).toContain('accessToken=');
        expect(response.headers.location).toContain('refreshToken=');
      });

      it('should return error for missing code', async () => {
        const response = await request(app)
          .get('/api/v1/auth/callback')
          .expect(400);

        expect(response.body.message).toBe('Authorization code missing');
      });
    });

    describe('POST /refresh', () => {
      it('should refresh tokens successfully', async () => {
        const tokens = generateTokens(mockUser);
        const req: any = {
          body: { refreshToken: tokens.refreshToken },
        };
        const res: any = {
          json: jest.fn(),
        };
        const next = jest.fn();

        // Mock Firebase user lookup
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => mockUser,
        });

        const { refreshToken } = require('../app/middlewares/auth.middleware');
        await refreshToken(req, res, next);

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Tokens refreshed successfully',
          })
        );
      });
    });
  });
});