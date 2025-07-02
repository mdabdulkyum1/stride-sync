import express from 'express';
import { AuthService } from './authService';

const router = express.Router();
const authService = AuthService.getInstance();

router.get('/strava', (req, res) => {
  const authUrl = authService.getAuthUrl();
  res.redirect(authUrl);
});

router.get('/strava/callback', async (req, res, next) => {
  const { code } = req.query;
  if (typeof code === 'string') {
    try {
      await authService.getTokens(code);
      res.redirect('/dashboard');
    } catch (error) {
      next(error);
    }
  } else {
    res.status(400).send('Authorization code missing');
  }
});

export const authRoutes = router;