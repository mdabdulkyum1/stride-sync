import express from 'express';
import { authController } from './auth.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = express.Router();

// Strava OAuth routes
router.get('/strava', authController.getCallbackUrl);
router.get('/strava/callback', authController.getCallback);

// Token refresh endpoint
router.post('/refresh', authController.refreshToken);

// Logout endpoint (requires authentication)
router.post('/logout', authenticateToken, authController.logout);

export const authRoutes = router;