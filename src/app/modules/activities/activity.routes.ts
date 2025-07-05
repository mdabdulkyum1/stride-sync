import express from 'express';
import { activityController } from './activity.controller';
import { authenticateToken, requireUserOrAdmin } from '../../middlewares/auth.middleware';

const router = express.Router();

// Protected activity routes (require authentication)
router.use(authenticateToken);

// Activity CRUD routes
router.post('/sync', requireUserOrAdmin, activityController.syncActivities);
router.get('/', requireUserOrAdmin, activityController.getUserActivities);
router.get('/:activityId', requireUserOrAdmin, activityController.getActivity);
router.put('/:activityId', requireUserOrAdmin, activityController.updateActivity);
router.delete('/:activityId', requireUserOrAdmin, activityController.deleteActivity);

// Progress routes
router.get('/progress/current', requireUserOrAdmin, activityController.getUserProgress);
router.post('/progress/update', requireUserOrAdmin, activityController.updateUserProgress);

export const activityRoutes = router; 