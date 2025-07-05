import express from 'express';
import { adminController } from './admin.controller';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Admin Dashboard Routes
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/registrations-chart', adminController.getUserRegistrationsChart);
router.get('/users', adminController.getAllUsers);

// Admin Configuration Routes
router.post('/config', adminController.createAdminConfig);
router.get('/config', adminController.getAdminConfig);
router.put('/config', adminController.updateAdminConfig);

// Export Routes
router.get('/export/users', adminController.exportUsersData);
router.get('/export/users/csv', adminController.generateCSVExport);

// Analytics Routes
router.get('/analytics', adminController.getAnalytics);

// Content Management Routes
router.put('/content/motivational-text', adminController.updateMotivationalText);
router.put('/content/brand-logo', adminController.updateBrandLogo);
router.put('/content/goals', adminController.updateGoals);
router.put('/content/features', adminController.updateFeatures);

export const adminRoutes = router; 