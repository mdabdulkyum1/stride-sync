import request from 'supertest';
import express from 'express';
import { userRoutes } from '../app/modules/users/user.routes';
import { UserService } from '../app/modules/users/user.service';
import { generateTokens } from '../app/middlewares/auth.middleware';

// Mock Firebase
jest.mock('../app/config/firebase', () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    where: jest.fn(() => ({
      get: jest.fn(),
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
    orderBy: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
}));

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Module Tests', () => {
  let userService: UserService;
  let mockUser: any;
  let mockTokens: any;

  beforeEach(() => {
    userService = UserService.getInstance();
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      stravaId: 'strava123',
      isActive: true,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    mockTokens = generateTokens(mockUser);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('UserService', () => {
    describe('getUserById', () => {
      it('should return user by ID', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => mockUser,
        });

        const result = await userService.getUserById('user123');

        expect(result).toBeDefined();
        expect(result?.id).toBe('user123');
        expect(result?.email).toBe('test@example.com');
      });

      it('should return null for non-existent user', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: false,
        });

        const result = await userService.getUserById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('getAllUsers', () => {
      it('should return paginated users', async () => {
        const mockUsers = [mockUser, { ...mockUser, id: 'user456' }];
        const db = require('../app/config/firebase');
        db.collection().where().get.mockResolvedValue({
          size: 2,
          docs: mockUsers.map(user => ({
            data: () => user,
          })),
        });

        const result = await userService.getAllUsers({
          limit: 10,
        });

        expect(result).toHaveLength(2);
      });

      it('should apply filters correctly', async () => {
        const db = require('../app/config/firebase');
        db.collection().where().get.mockResolvedValue({
          size: 1,
          docs: [{
            data: () => mockUser,
          }],
        });

        const result = await userService.getAllUsers({
          limit: 10,
          role: 'user',
          isActive: true,
        });

        expect(result).toHaveLength(1);
      });
    });

    describe('getUserDashboard', () => {
      it('should return user dashboard data', async () => {
        const mockActivities = [
          {
            id: 'activity1',
            name: 'Morning Run',
            type: 'Run',
            distance: 5.0,
            duration: 1800,
            averagePace: 6.0,
            date: '2024-01-01',
          },
          {
            id: 'activity2',
            name: 'Evening Walk',
            type: 'Walk',
            distance: 3.0,
            duration: 1200,
            averagePace: 8.0,
            date: '2024-01-02',
          },
        ];

        const db = require('../app/config/firebase');
        db.collection().doc().collection().orderBy().get.mockResolvedValue({
          docs: mockActivities.map(activity => ({
            data: () => activity,
          })),
        });

        const result = await userService.getUserDashboard('user123');

        expect(result.totalActivities).toBe(2);
        expect(result.totalDistance).toBe(8.0);
        expect(result.averagePace).toBe(7.0);
        expect(result.monthlyProgress).toBeGreaterThan(0);
      });

      it('should handle user with no activities', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().collection().orderBy().get.mockResolvedValue({
          docs: [],
        });

        const result = await userService.getUserDashboard('user123');

        expect(result.totalActivities).toBe(0);
        expect(result.totalDistance).toBe(0);
        expect(result.averagePace).toBe(0);
        expect(result.monthlyProgress).toBe(0);
      });
    });

    describe('updateUser', () => {
      it('should update user successfully', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().update.mockResolvedValue(undefined);
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => ({ ...mockUser, name: 'Updated Name' }),
        });

        const updates = { name: 'Updated Name' };
        const result = await userService.updateUser('user123', updates);

        expect(result?.name).toBe('Updated Name');
      });

      it('should return null for non-existent user', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: false,
        });

        const result = await userService.updateUser('nonexistent', { name: 'Updated' });

        expect(result).toBeNull();
      });
    });

    describe('deleteUser', () => {
      it('should soft delete user', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().update.mockResolvedValue(undefined);

        const result = await userService.deleteUser('user123');

        expect(result).toBe(true);
        expect(db.collection().doc().update).toHaveBeenCalledWith({
          isActive: false,
          deletedAt: expect.any(Number),
        });
      });
    });
  });

  describe('User Controller', () => {
    describe('getUserProfile', () => {
      it('should return user profile for authenticated user', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => mockUser,
        });

        const response = await request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('user123');
        expect(response.body.data.email).toBe('test@example.com');
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app)
          .get('/api/users/profile')
          .expect(401);

        expect(response.body.message).toBe('Access token is required');
      });
    });

    describe('getUserDashboard', () => {
      it('should return user dashboard data', async () => {
        const mockDashboardData = {
          totalActivities: 5,
          totalDistance: 25.5,
          monthlyProgress: 75,
          averagePace: 6.2,
          recentActivities: [],
        };

        jest.spyOn(userService, 'getUserDashboard').mockResolvedValue(mockDashboardData);

        const response = await request(app)
          .get('/api/users/dashboard')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalActivities).toBe(5);
        expect(response.body.data.totalDistance).toBe(25.5);
      });
    });

    describe('getAllUsers (Admin)', () => {
      it('should return all users for admin', async () => {
        jest.spyOn(userService, 'getAllUsers').mockResolvedValue([mockUser]);

        // Create admin tokens
        const adminUser = { ...mockUser, role: 'admin' };
        const adminTokens = generateTokens(adminUser);

        const response = await request(app)
          .get('/api/users?page=1&limit=10')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toHaveLength(1);
      });

      it('should deny access for non-admin users', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(403);

        expect(response.body.message).toContain('Access denied');
      });
    });

    describe('updateUser (Admin)', () => {
      it('should update user for admin', async () => {
        const updatedUser = { ...mockUser, name: 'Updated Name' };
        jest.spyOn(userService, 'updateUser').mockResolvedValue(updatedUser);

        const adminUser = { ...mockUser, role: 'admin' };
        const adminTokens = generateTokens(adminUser);

        const response = await request(app)
          .put('/api/users/user123')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Name');
      });
    });

    describe('deleteUser (Admin)', () => {
      it('should delete user for admin', async () => {
        jest.spyOn(userService, 'deleteUser').mockResolvedValue(undefined);

        const adminUser = { ...mockUser, role: 'admin' };
        const adminTokens = generateTokens(adminUser);

        const response = await request(app)
          .delete('/api/users/user123')
          .set('Authorization', `Bearer ${adminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('User deleted successfully');
      });
    });
  });

  describe('User Routes', () => {
    describe('Authentication Required', () => {
      it('should require authentication for all routes', async () => {
        const routes = [
          { method: 'get', path: '/api/users/profile' },
          { method: 'get', path: '/api/users/dashboard' },
          { method: 'get', path: '/api/users' },
          { method: 'put', path: '/api/users/user123' },
          { method: 'delete', path: '/api/users/user123' },
        ];

        for (const route of routes) {
          const response = await (request(app) as any)[route.method](route.path);
          expect(response.status).toBe(401);
        }
      });
    });

    describe('Role-based Access', () => {
      it('should allow admin access to admin routes', async () => {
        const adminUser = { ...mockUser, role: 'admin' };
        const adminTokens = generateTokens(adminUser);

        const adminRoutes = [
          { method: 'get', path: '/api/users' },
          { method: 'put', path: '/api/users/user123' },
          { method: 'delete', path: '/api/users/user123' },
        ];

        for (const route of adminRoutes) {
          const response = await (request(app) as any)[route.method](route.path)
            .set('Authorization', `Bearer ${adminTokens.accessToken}`);
          
          // Should not be 403 (forbidden)
          expect(response.status).not.toBe(403);
        }
      });

      it('should deny non-admin access to admin routes', async () => {
        const userRoutes = [
          { method: 'get', path: '/api/users' },
          { method: 'put', path: '/api/users/user123' },
          { method: 'delete', path: '/api/users/user123' },
        ];

        for (const route of userRoutes) {
          const response = await (request(app) as any)[route.method](route.path)
            .set('Authorization', `Bearer ${mockTokens.accessToken}`);
          
          expect(response.status).toBe(403);
        }
      });
    });
  });
}); 