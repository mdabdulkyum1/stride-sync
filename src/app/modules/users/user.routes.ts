import express from 'express';
import { userController } from './user.controller';
import { authenticateToken, requireAdmin, requireUserOrAdmin } from '../../middlewares/auth.middleware';

const router = express.Router();

// Protected user routes (require authentication)
router.use(authenticateToken);

// Admin-only routes
router.get('/search', requireAdmin, userController.searchUsers);
router.get('/count', requireAdmin, userController.getUserCount);
router.get('/email', requireAdmin, userController.getUserByEmail);
router.get('/:userId', requireAdmin, userController.getUserById);
router.put('/:userId', requireAdmin, userController.updateUser);
router.delete('/:userId', requireAdmin, userController.deleteUser);
router.delete('/:userId/hard', requireAdmin, userController.hardDeleteUser);

// Dashboard routes (user can access their own dashboard)
router.get('/:userId/dashboard', requireUserOrAdmin, userController.getUserDashboard);
router.get('/dashboard', requireUserOrAdmin, userController.getUserDashboard); // Current user dashboard

// User management routes
router.post('/login/update', requireUserOrAdmin, userController.updateLastLogin);

export const userRoutes = router; 