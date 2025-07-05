import request from 'supertest';
import express from 'express';
import { activityRoutes } from '../app/modules/activities/activity.routes';
import { ActivityService } from '../app/modules/activities/activity.service';
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
app.use('/api/activities', activityRoutes);

describe('Activities Module Tests', () => {
  let activityService: ActivityService;
  let mockUser: any;
  let mockTokens: any;
  let mockActivity: any;

  beforeEach(() => {
    activityService = ActivityService.getInstance();
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

    mockActivity = {
      id: 'activity123',
      userId: 'user123',
      stravaId: 'strava_activity_123',
      name: 'Morning Run',
      type: 'Run',
      distance: 5.0,
      duration: 1800,
      averagePace: 6.0,
      averageSpeed: 10.0,
      calories: 400,
      date: '2024-01-01T06:00:00Z',
      startDate: '2024-01-01T06:00:00Z',
      endDate: '2024-01-01T06:30:00Z',
      description: 'Great morning run',
      isActive: true,
      createdAt: Date.now(),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('ActivityService', () => {
    describe('getUserActivities', () => {
      it('should return user activities', async () => {
        const mockActivities = [mockActivity, { ...mockActivity, id: 'activity456' }];
        const db = require('../app/config/firebase');
        db.collection().doc().collection().where().orderBy().limit().get.mockResolvedValue({
          docs: mockActivities.map(activity => ({
            data: () => activity,
          })),
        });

        const result = await activityService.getUserActivities('user123', { limit: 10 });

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Morning Run');
        expect(result[0].distance).toBe(5.0);
      });

      it('should return empty array for user with no activities', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().collection().where().orderBy().limit().get.mockResolvedValue({
          docs: [],
        });

        const result = await activityService.getUserActivities('user123', { limit: 10 });

        expect(result).toHaveLength(0);
      });
    });

    describe('getActivityById', () => {
      it('should return activity by ID', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => mockActivity,
        });

        const result = await activityService.getActivityById('user123', 'activity123');

        expect(result).toBeDefined();
        expect(result?.name).toBe('Morning Run');
        expect(result?.distance).toBe(5.0);
      });

      it('should return null for non-existent activity', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().collection().doc().get.mockResolvedValue({
          exists: false,
        });

        const result = await activityService.getActivityById('user123', 'nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('createActivity', () => {
      it('should create new activity', async () => {
        const activityData = {
          stravaId: 'strava_activity_456',
          name: 'Evening Walk',
          type: 'Walk',
          distance: 3.0,
          duration: 1200,
          averagePace: 8.0,
          date: '2024-01-02T18:00:00Z',
        };

        const db = require('../app/config/firebase');
        db.collection().doc().collection().add.mockResolvedValue({
          id: 'new-activity-id',
        });

        const result = await activityService.createActivity('user123', activityData);

        expect(result).toBeDefined();
        expect(result.name).toBe('Evening Walk');
        expect(result.type).toBe('Walk');
      });
    });

    describe('updateActivity', () => {
      it('should update activity', async () => {
        const updates = {
          name: 'Updated Morning Run',
          description: 'Updated description',
        };

        const updatedActivity = { ...mockActivity, ...updates };

        const db = require('../app/config/firebase');
        db.collection().doc().collection().doc().update.mockResolvedValue(undefined);
        db.collection().doc().collection().doc().get.mockResolvedValue({
          exists: true,
          data: () => updatedActivity,
        });

        const result = await activityService.updateActivity('user123', 'activity123', updates);

        expect(result?.name).toBe('Updated Morning Run');
        expect(result?.description).toBe('Updated description');
      });

      it('should return null for non-existent activity', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().collection().doc().get.mockResolvedValue({
          exists: false,
        });

        const result = await activityService.updateActivity('user123', 'nonexistent', { name: 'Updated' });

        expect(result).toBeNull();
      });
    });

    describe('deleteActivity', () => {
      it('should delete activity', async () => {
        const db = require('../app/config/firebase');
        db.collection().doc().collection().doc().delete.mockResolvedValue(undefined);

        const result = await activityService.deleteActivity('user123', 'activity123');

        expect(result).toBe(true);
      });
    });

    describe('syncStravaActivities', () => {
      it('should sync Strava activities', async () => {
        const mockStravaActivities = [
          {
            id: 123,
            name: 'Strava Activity 1',
            type: 'Run',
            distance: 5000,
            moving_time: 1800,
            average_speed: 2.78,
            start_date: '2024-01-01T06:00:00Z',
          },
          {
            id: 456,
            name: 'Strava Activity 2',
            type: 'Walk',
            distance: 3000,
            moving_time: 1200,
            average_speed: 2.5,
            start_date: '2024-01-02T18:00:00Z',
          },
        ];

        const db = require('../app/config/firebase');
        db.collection().doc().collection().where().get.mockResolvedValue({
          docs: [],
        });
        db.collection().doc().collection().add.mockResolvedValue({
          id: 'new-activity-id',
        });

        const result = await activityService.syncStravaActivities('user123', mockStravaActivities);

        expect(result.synced).toBe(2);
        expect(result.skipped).toBe(0);
        expect(result.errors).toBe(0);
      });

      it('should skip existing activities', async () => {
        const mockStravaActivities = [
          {
            id: 123,
            name: 'Strava Activity 1',
            type: 'Run',
            distance: 5000,
            moving_time: 1800,
            average_speed: 2.78,
            start_date: '2024-01-01T06:00:00Z',
          },
        ];

        const existingActivity = {
          stravaId: '123',
          name: 'Existing Activity',
        };

        const db = require('../app/config/firebase');
        db.collection().doc().collection().where().get.mockResolvedValue({
          docs: [{
            data: () => existingActivity,
          }],
        });

        const result = await activityService.syncStravaActivities('user123', mockStravaActivities);

        expect(result.synced).toBe(0);
        expect(result.skipped).toBe(1);
        expect(result.errors).toBe(0);
      });
    });
  });

  describe('Activity Controller', () => {
    describe('getUserActivities', () => {
      it('should return user activities for authenticated user', async () => {
        const mockActivities = [mockActivity];
        jest.spyOn(activityService, 'getUserActivities').mockResolvedValue(mockActivities);

        const response = await request(app)
          .get('/api/activities?limit=10')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Morning Run');
      });

      it('should return 401 for unauthenticated request', async () => {
        const response = await request(app)
          .get('/api/activities')
          .expect(401);

        expect(response.body.message).toBe('Access token is required');
      });
    });

    describe('getActivityById', () => {
      it('should return specific activity for authenticated user', async () => {
        jest.spyOn(activityService, 'getActivityById').mockResolvedValue(mockActivity);

        const response = await request(app)
          .get('/api/activities/activity123')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Morning Run');
        expect(response.body.data.distance).toBe(5.0);
      });

      it('should return 404 for non-existent activity', async () => {
        jest.spyOn(activityService, 'getActivityById').mockResolvedValue(null);

        const response = await request(app)
          .get('/api/activities/nonexistent')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(404);

        expect(response.body.message).toBe('Activity not found');
      });
    });

    describe('createActivity', () => {
      it('should create new activity for authenticated user', async () => {
        const activityData = {
          name: 'New Activity',
          type: 'Run',
          distance: 5.0,
          duration: 1800,
          date: '2024-01-01T06:00:00Z',
        };

        const newActivity = { ...mockActivity, ...activityData, id: 'new-activity-id' };
        jest.spyOn(activityService, 'createActivity').mockResolvedValue(newActivity);

        const response = await request(app)
          .post('/api/activities')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .send(activityData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('New Activity');
      });
    });

    describe('updateActivity', () => {
      it('should update activity for authenticated user', async () => {
        const updates = {
          name: 'Updated Activity Name',
          description: 'Updated description',
        };

        const updatedActivity = { ...mockActivity, ...updates };
        jest.spyOn(activityService, 'updateActivity').mockResolvedValue(updatedActivity);

        const response = await request(app)
          .put('/api/activities/activity123')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Activity Name');
      });

      it('should return 404 for non-existent activity', async () => {
        jest.spyOn(activityService, 'updateActivity').mockResolvedValue(null);

        const response = await request(app)
          .put('/api/activities/nonexistent')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .send({ name: 'Updated' })
          .expect(404);

        expect(response.body.message).toBe('Activity not found');
      });
    });

    describe('deleteActivity', () => {
      it('should delete activity for authenticated user', async () => {
        jest.spyOn(activityService, 'deleteActivity').mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/activities/activity123')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Activity deleted successfully');
      });
    });

    describe('syncStravaActivities', () => {
      it('should sync Strava activities for authenticated user', async () => {
        const syncResult = {
          synced: 2,
          skipped: 0,
          errors: 0,
        };

        jest.spyOn(activityService, 'syncStravaActivities').mockResolvedValue(syncResult);

        const response = await request(app)
          .post('/api/activities/sync')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.synced).toBe(2);
        expect(response.body.data.skipped).toBe(0);
      });
    });
  });

  describe('Activity Routes', () => {
    describe('Authentication Required', () => {
      it('should require authentication for all activity routes', async () => {
        const routes = [
          { method: 'get', path: '/api/activities' },
          { method: 'get', path: '/api/activities/activity123' },
          { method: 'post', path: '/api/activities' },
          { method: 'put', path: '/api/activities/activity123' },
          { method: 'delete', path: '/api/activities/activity123' },
          { method: 'post', path: '/api/activities/sync' },
        ];

        for (const route of routes) {
          const response = await (request(app) as any)[route.method](route.path);
          expect(response.status).toBe(401);
        }
      });
    });

    describe('User Access Control', () => {
      it('should allow users to access their own activities', async () => {
        const mockActivities = [mockActivity];
        jest.spyOn(activityService, 'getUserActivities').mockResolvedValue(mockActivities);

        const response = await request(app)
          .get('/api/activities')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow users to access their own specific activity', async () => {
        jest.spyOn(activityService, 'getActivityById').mockResolvedValue(mockActivity);

        const response = await request(app)
          .get('/api/activities/activity123')
          .set('Authorization', `Bearer ${mockTokens.accessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });
}); 