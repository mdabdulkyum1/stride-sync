import express from 'express';
import { authController } from './auth.controller';

const router = express.Router();


router.get('/strava', authController.getCallbackUrl);

router.get('/strava/callback', authController.getCallback);

export const authRoutes = router;