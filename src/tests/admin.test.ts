import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../app/modules/admin/admin.routes';
import { AdminService } from '../app/modules/admin/admin.service';
import { generateTokens } from '../app/middlewares/auth.middleware';

// Mock Firebase
jest.mock('../app/config/firebase', () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
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
  collectionGroup: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Module Tests', () => {
  let adminService: AdminService;
  let mockAdminUser: any;
  let mockAdminTokens: any;

  beforeEach(() => {
    adminService = AdminService.getInstance();
    mockAdminUser = {
      id: 'admin123',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      stravaId: 'strava123',
      isActive: true,
      createdAt: Date.now(),
    };

    mockAdminTokens = generateTokens(mockAdminUser);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('AdminService', () => {
    describe('getDashboardStats', () => {
      it('should return dashboard statistics', async () => {
        const mockUsersSnapshot = {
          size: 10,
        };

        const mockActiveUsersSnapshot = {
          size: 7,
        };

        const mockNewUsersSnapshot = {
          size: 3,
        };

        const mockActivitiesSnapshot = {
          forEach: jest.fn((callback) => {
            // Mock activities data
            const mockActivities = [
              { distance: 5.0 },
              { distance: 3.5 },
              { distance: 7.2 },
            ];
            mockActivities.forEach((activity, index) => {
              callback({ data: () => activity }, index);
            });
          }),
        };

        const db = require('../app/config/firebase');
        db.collection().get.mockResolvedValue(mockUsersSnapshot);
        db.collection().where().get.mockResolvedValue(mockActiveUsersSnapshot);
        db.collectionGroup().get.mockResolvedValue(mockActivitiesSnapshot);

        const result = await adminService.getDashboardStats();

        expect(result.totalUsers).toBe(10);
        expect(result.activeUsers).toBe(7);
        expect(result.newUsersThisMonth).toBe(3);
        expect(result.totalActivities).toBe(3);
        expect(result.totalDistance).toBe(15.7);
      });
    });

    describe('getUserRegistrationsChart', () => {
      it('should return user registrations chart data', async () => {
        const mockUsersSnapshot = {
          forEach: jest.fn((callback) => {
            const mockUsers = [
              { createdAt: { toDate: () => new Date('2024-01-01') } },
              { createdAt: { toDate: () => new Date('2024-01-02') } },
              { createdAt: { toDate: () => new Date('2024-01-03') } },
            ];
            mockUsers.forEach((user, index) => {
              callback({ data: () => user }, index);
            });
          }),
        };

        const db = require('../app/config/firebase');
        db.collection().where().orderBy().get.mockResolvedValue(mockUsersSnapshot);

        const result = await adminService.getUserRegistrationsChart();

        expect(result.dates).toBeDefined();
        expect(result.registrations).toBeDefined();
        expect(result.dates.length).toBe(30);
        expect(result.registrations.length).toBe(30);
      });
    });

    describe('getAllUsers', () => {
      it('should return all users with pagination', async () => {
        const mockUsers = [
          { id: 'user1', name: 'User 1', email: 'user1@example.com' },
          { id: 'user2', name: 'User 2', email: 'user2@example.com' },
        ];

        const mockSnapshot = {
          size: 2,
          docs: mockUsers.map(user => ({
            data: () => user,
          })),
        };

        const db = require('../app/config/firebase');
        db.collection().where().get.mockResolvedValue(mockSnapshot);
        db.collection().where().orderBy().limit().offset().get.mockResolvedValue(mockSnapshot);

        const result = await adminService.getAllUsers({
          page: 1,
          limit: 10,
        });

        expect(result.users).toHaveLength(2);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });
    });

    describe('createAdminConfig', () => {
      it('should create admin configuration', async () => {
        const configData = {
          motivationalText: 'Keep pushing!',
          dashboardTitle: 'Fitness Dashboard',
        };

        const db = require('../app/config/firebase');
        db.collection().doc().set.mockResolvedValue(undefined);

        const result = await adminService.createAdminConfig(configData);

        expect(result.motivationalText).toBe('Keep pushing!');
        expect(result.dashboardTitle).toBe('Fitness Dashboard');
        expect(result.brandLogo).toBeDefined();
        expect(result.goals).toBeDefined();
        expect(result.features).toBeDefined();
      });
    });

    describe('getAdminConfig', () => {
      it('should return admin configuration', async () => {
        const mockConfig = {
          motivationalText: 'Keep pushing!',
          dashboardTitle: 'Fitness Dashboard',
          brandLogo: { url: '', altText: 'Logo' },
          goals: { defaultMonthly: 26.2, defaultSeasonal: 78.6 },
          features: {
            showRecentActivities: true,
            showAchievements: true,
            showPace: true,
            showCalories: true,
          },
        };

        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => mockConfig,
        });

        const result = await adminService.getAdminConfig();

        expect(result).toEqual(mockConfig);
      });

      it('should return null for non-existent config', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().get.mockResolvedValue({
          exists: false,
        });

        const result = await adminService.getAdminConfig();

        expect(result).toBeNull();
      });
    });

    describe('updateAdminConfig', () => {
      it('should update admin configuration', async () => {
        const updates = {
          motivationalText: 'Updated motivational text',
        };

        const updatedConfig = {
          motivationalText: 'Updated motivational text',
          dashboardTitle: 'Fitness Dashboard',
          brandLogo: { url: '', altText: 'Logo' },
          goals: { defaultMonthly: 26.2, defaultSeasonal: 78.6 },
          features: {
            showRecentActivities: true,
            showAchievements: true,
            showPace: true,
            showCalories: true,
          },
        };

        const db = require('../app/config/firebase');
        db.collection().doc().update.mockResolvedValue(undefined);
        db.collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => updatedConfig,
        });

        const result = await adminService.updateAdminConfig(updates);

        expect(result.motivationalText).toBe('Updated motivational text');
      });
    });

    describe('exportUsersData', () => {
      it('should export users data', async () => {
        const mockUsers = [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@example.com',
            isActive: true,
          },
        ];

        const mockUsersSnapshot = {
          forEach: jest.fn((callback) => {
            mockUsers.forEach((user, index) => {
              callback({ data: () => user }, index);
            });
          }),
        };

        const db = require('../app/config/firebase');
        db.collection().where().get.mockResolvedValue(mockUsersSnapshot);
        db.collection().doc().collection().doc().get.mockResolvedValue({
          exists: false,
        });
        db.collection().doc().collection().orderBy().limit().get.mockResolvedValue({
          empty: true,
        });

        const options = {
          format: 'csv' as const,
          filters: {},
          includeFields: [],
        };

        const result = await adminService.exportUsersData(options);

        expect(result.users).toHaveLength(1);
        expect(result.totalUsers).toBe(1);
        expect(result.exportDate).toBeDefined();
      });
    });

    describe('getAnalytics', () => {
      it('should return analytics data', async () => {
        const mockAnalytics = {
          totalUsers: 100,
          activeUsers: 75,
          totalActivities: 500,
          totalDistance: 2500,
          averagePace: 6.5,
          goalAchievers: 25,
        };

        const db = require('../app/config/firebase');
        db.collection().get.mockResolvedValue({ size: 100 });
        db.collection().where().get.mockResolvedValue({ size: 75 });
        db.collectionGroup().get.mockResolvedValue({
          forEach: jest.fn((callback) => {
            // Mock activities
            for (let i = 0; i < 500; i++) {
              callback({ data: () => ({ distance: 5 }) }, i);
            }
          }),
        });

        const result = await adminService.getAnalytics();

        expect(result.totalUsers).toBe(100);
        expect(result.activeUsers).toBe(75);
        expect(result.totalActivities).toBe(500);
        expect(result.totalDistance).toBe(2500);
      });
    });
  });

  describe('Admin Controller', () => {
    describe('getDashboardStats', () => {
      it('should return dashboard stats for admin', async () => {
        const mockStats = {
          totalUsers: 100,
          totalActivities: 500,
          totalDistance: 2500,
          activeUsers: 75,
          newUsersThisMonth: 10,
        };

        jest.spyOn(adminService, 'getDashboardStats').mockResolvedValue(mockStats);

        const response = await request(app)
          .get('/api/admin/dashboard/stats')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalUsers).toBe(100);
        expect(response.body.data.totalActivities).toBe(500);
      });

      it('should deny access for non-admin users', async () => {
        const regularUser = { ...mockAdminUser, role: 'user' };
        const regularTokens = generateTokens(regularUser);

        const response = await request(app)
          .get('/api/admin/dashboard/stats')
          .set('Authorization', `Bearer ${regularTokens.accessToken}`)
          .expect(403);

        expect(response.body.message).toContain('Access denied');
      });
    });

    describe('getUserRegistrationsChart', () => {
      it('should return registrations chart data for admin', async () => {
        const mockChartData = {
          dates: ['2024-01-01', '2024-01-02', '2024-01-03'],
          registrations: [5, 3, 7],
        };

        jest.spyOn(adminService, 'getUserRegistrationsChart').mockResolvedValue(mockChartData);

        const response = await request(app)
          .get('/api/admin/dashboard/registrations-chart')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.dates).toHaveLength(3);
        expect(response.body.data.registrations).toHaveLength(3);
      });
    });

    describe('getAllUsers', () => {
      it('should return all users for admin', async () => {
        const mockUsersData = {
          users: [mockAdminUser],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        };

        jest.spyOn(adminService, 'getAllUsers').mockResolvedValue(mockUsersData);

        const response = await request(app)
          .get('/api/admin/users?page=1&limit=10')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toHaveLength(1);
      });
    });

    describe('createAdminConfig', () => {
      it('should create admin config for admin', async () => {
        const configData = {
          motivationalText: 'Keep pushing!',
          dashboardTitle: 'Fitness Dashboard',
        };

        const mockConfig = {
          ...configData,
          brandLogo: { url: '', altText: 'Logo' },
          goals: { defaultMonthly: 26.2, defaultSeasonal: 78.6 },
          features: {
            showRecentActivities: true,
            showAchievements: true,
            showPace: true,
            showCalories: true,
          },
        };

        jest.spyOn(adminService, 'createAdminConfig').mockResolvedValue(mockConfig);

        const response = await request(app)
          .post('/api/admin/config')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .send(configData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.motivationalText).toBe('Keep pushing!');
      });
    });

    describe('getAdminConfig', () => {
      it('should return admin config for admin', async () => {
        const mockConfig = {
          motivationalText: 'Keep pushing!',
          dashboardTitle: 'Fitness Dashboard',
          brandLogo: { url: '', altText: 'Logo' },
          goals: { defaultMonthly: 26.2, defaultSeasonal: 78.6 },
          features: {
            showRecentActivities: true,
            showAchievements: true,
            showPace: true,
            showCalories: true,
          },
        };

        jest.spyOn(adminService, 'getAdminConfig').mockResolvedValue(mockConfig);

        const response = await request(app)
          .get('/api/admin/config')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.motivationalText).toBe('Keep pushing!');
      });
    });

    describe('exportUsersData', () => {
      it('should export users data for admin', async () => {
        const mockExportData = {
          users: [mockAdminUser],
          totalUsers: 1,
          goalAchievers: 0,
          exportDate: new Date().toISOString(),
          season: 'Spring',
          year: 2024,
        };

        jest.spyOn(adminService, 'exportUsersData').mockResolvedValue(mockExportData);

        const response = await request(app)
          .get('/api/admin/export/users?format=csv')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalUsers).toBe(1);
      });
    });

    describe('getAnalytics', () => {
      it('should return analytics for admin', async () => {
        const mockAnalytics = {
          totalUsers: 100,
          activeUsers: 75,
          totalActivities: 500,
          totalDistance: 2500,
          averagePace: 6.5,
          goalAchievers: 25,
        };

        jest.spyOn(adminService, 'getAnalytics').mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get('/api/admin/analytics')
          .set('Authorization', `Bearer ${mockAdminTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalUsers).toBe(100);
        expect(response.body.data.totalActivities).toBe(500);
      });
    });
  });

  describe('Admin Routes', () => {
    describe('Authentication Required', () => {
      it('should require authentication for all admin routes', async () => {
        const routes = [
          { method: 'get', path: '/api/admin/dashboard/stats' },
          { method: 'get', path: '/api/admin/dashboard/registrations-chart' },
          { method: 'get', path: '/api/admin/users' },
          { method: 'post', path: '/api/admin/config' },
          { method: 'get', path: '/api/admin/config' },
          { method: 'put', path: '/api/admin/config' },
          { method: 'get', path: '/api/admin/export/users' },
          { method: 'get', path: '/api/admin/analytics' },
        ];

        for (const route of routes) {
          const response = await (request(app) as any)[route.method](route.path);
          expect(response.status).toBe(401);
        }
      });
    });

    describe('Admin Role Required', () => {
      it('should deny non-admin access to admin routes', async () => {
        const regularUser = { ...mockAdminUser, role: 'user' };
        const regularTokens = generateTokens(regularUser);

        const adminRoutes = [
          { method: 'get', path: '/api/admin/dashboard/stats' },
          { method: 'get', path: '/api/admin/users' },
          { method: 'post', path: '/api/admin/config' },
        ];

        for (const route of adminRoutes) {
          const response = await (request(app) as any)[route.method](route.path)
            .set('Authorization', `Bearer ${regularTokens.accessToken}`);
          
          expect(response.status).toBe(403);
        }
      });
    });
  });
}); 