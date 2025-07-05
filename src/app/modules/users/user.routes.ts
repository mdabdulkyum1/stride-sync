import express from 'express';
import { userController } from './user.controller';
import { authenticateToken, requireAdmin, requireUserOrAdmin } from '../../middlewares/auth.middleware';

const router = express.Router();

// Admin-only routes (require authentication + admin role)
router.get('/search', authenticateToken, requireAdmin, userController.searchUsers);
router.get('/count', authenticateToken, requireAdmin, userController.getUserCount);
router.get('/email', authenticateToken, requireAdmin, userController.getUserByEmail);
router.get('/:userId', authenticateToken, requireAdmin, userController.getUserById);
router.put('/:userId', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/:userId', authenticateToken, requireAdmin, userController.deleteUser);
router.delete('/:userId/hard', authenticateToken, requireAdmin, userController.hardDeleteUser);

// Dashboard routes (user can access their own dashboard)
router.get('/:userId/dashboard', authenticateToken, requireUserOrAdmin, userController.getUserDashboard);
router.get('/dashboard', authenticateToken, requireUserOrAdmin, userController.getUserDashboard); // Current user dashboard

// User management routes
router.post('/login/update', authenticateToken, requireUserOrAdmin, userController.updateLastLogin);

export const userRoutes = router; 