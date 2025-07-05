import { Request, Response, NextFunction } from 'express';
import {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireUserOrAdmin,
  refreshToken,
  logout,
} from '../app/middlewares/auth.middleware';
import { generateTokens } from '../app/middlewares/auth.middleware';
import config from '../app/config';
import jwt from 'jsonwebtoken';

// Mock Firebase
jest.mock('../app/config/firebase', () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      update: jest.fn(),
    })),
  })),
}));

describe('Auth Middleware Tests', () => {
  let mockUser: any;
  let mockTokens: any;
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      stravaId: 'strava123',
      isActive: true,
      createdAt: Date.now(),
    };

    mockTokens = generateTokens(mockUser);

    mockReq = {
      headers: {},
      body: {},
      user: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', () => {
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

      expect(decodedRefresh).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should include stravaId in access token', () => {
      const tokens = generateTokens(mockUser);
      const decodedAccess = jwt.verify(tokens.accessToken, config.jwt.accessSecret as string) as any;

      expect(decodedAccess.stravaId).toBe(mockUser.stravaId);
    });

    it('should throw error if JWT secrets not configured', () => {
      const originalSecret = config.jwt.accessSecret;
      (config.jwt as any).accessSecret = undefined;

      expect(() => generateTokens(mockUser)).toThrow('JWT secrets not configured');

      (config.jwt as any).accessSecret = originalSecret;
    });
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and attach user to request', async () => {
      mockReq.headers.authorization = `Bearer ${mockTokens.accessToken}`;

      // Mock Firebase user lookup
      const db = require('../app/config/firebase');
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(mockUser.id);
      expect(mockReq.user.email).toBe(mockUser.email);
      expect(mockReq.user.role).toBe(mockUser.role);
    });

    it('should reject request without token', async () => {
      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access token is required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid token',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { id: mockUser.id, email: mockUser.email, role: mockUser.role },
        config.jwt.accessSecret as string,
        { expiresIn: '0s' }
      );

      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Token expired',
        })
      );
    });

    it('should reject request for non-existent user', async () => {
      mockReq.headers.authorization = `Bearer ${mockTokens.accessToken}`;

      // Mock Firebase user lookup - user doesn't exist
      const db = require('../app/config/firebase');
      db.collection().doc().get.mockResolvedValue({
        exists: false,
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User not found',
        })
      );
    });

    it('should reject request for inactive user', async () => {
      mockReq.headers.authorization = `Bearer ${mockTokens.accessToken}`;

      // Mock Firebase user lookup - inactive user
      const db = require('../app/config/firebase');
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => ({ ...mockUser, isActive: false }),
      });

      await authenticateToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User account is deactivated',
        })
      );
    });
  });

  describe('optionalAuth', () => {
    it('should continue without user when no token provided', async () => {
      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should attach user when valid token provided', async () => {
      mockReq.headers.authorization = `Bearer ${mockTokens.accessToken}`;

      // Mock Firebase user lookup
      const db = require('../app/config/firebase');
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe(mockUser.id);
    });

    it('should continue without user on invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await optionalAuth(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', () => {
      mockReq.user = { role: 'admin' };

      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access for user with one of multiple required roles', () => {
      mockReq.user = { role: 'user' };

      const userOrAdminMiddleware = requireRole(['user', 'admin']);
      userOrAdminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for user without required role', () => {
      mockReq.user = { role: 'user' };

      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Access denied'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      mockReq.user = undefined;

      const adminMiddleware = requireRole(['admin']);
      adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      mockReq.user = { role: 'admin' };

      requireAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for non-admin user', () => {
      mockReq.user = { role: 'user' };

      requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Access denied'),
        })
      );
    });
  });

  describe('requireUserOrAdmin', () => {
    it('should allow access for user role', () => {
      mockReq.user = { role: 'user' };

      requireUserOrAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access for admin role', () => {
      mockReq.user = { role: 'admin' };

      requireUserOrAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for other roles', () => {
      mockReq.user = { role: 'moderator' };

      requireUserOrAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Access denied'),
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      mockReq.body = { refreshToken: mockTokens.refreshToken };

      // Mock Firebase user lookup
      const db = require('../app/config/firebase');
      db.collection().doc().get.mockResolvedValue({
        exists: true,
        data: () => mockUser,
      });

      await refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Tokens refreshed successfully',
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({
              id: mockUser.id,
              email: mockUser.email,
              role: mockUser.role,
            }),
          }),
        })
      );
    });

    it('should reject request without refresh token', async () => {
      mockReq.body = {};

      await refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Refresh token is required',
        })
      );
    });

    it('should reject invalid refresh token', async () => {
      mockReq.body = { refreshToken: 'invalid-refresh-token' };

      await refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid refresh token',
        })
      );
    });

    it('should reject expired refresh token', async () => {
      // Create expired refresh token
      const expiredRefreshToken = jwt.sign(
        { id: mockUser.id, email: mockUser.email, role: mockUser.role },
        config.jwt.refreshSecret as string,
        { expiresIn: '0s' }
      );

      mockReq.body = { refreshToken: expiredRefreshToken };

      await refreshToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Refresh token expired',
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockReq.user = mockUser;

      // Mock Firebase update
      const db = require('../app/config/firebase');
      db.collection().doc().update.mockResolvedValue(undefined);

      await logout(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });

    it('should handle logout without user', async () => {
      mockReq.user = undefined;

      await logout(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });

    it('should handle Firebase errors gracefully', async () => {
      mockReq.user = mockUser;

      // Mock Firebase error
      const db = require('../app/config/firebase');
      db.collection().doc().update.mockRejectedValue(new Error('Firebase error'));

      await logout(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 