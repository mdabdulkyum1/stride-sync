import express from 'express';
import { adminController } from './admin.controller';
import { authenticateToken, requireAdmin } from '../../middlewares/auth.middleware';

const router = express.Router();

// Protected admin routes (require authentication and admin role)
router.use(authenticateToken);
router.use(requireAdmin);

// Admin configuration routes
router.post('/config', adminController.createAdminConfig);
router.get('/config', adminController.getAdminConfig);
router.put('/config', adminController.updateAdminConfig);

// Export routes
router.get('/export', adminController.exportUsersData);
router.get('/export/csv', adminController.generateCSVExport);

// Analytics routes
router.get('/analytics', adminController.getAnalytics);

// Content management routes
router.put('/motivational-text', adminController.updateMotivationalText);
router.put('/brand-logo', adminController.updateBrandLogo);
router.put('/goals', adminController.updateGoals);
router.put('/features', adminController.updateFeatures);

export const adminRoutes = router; 