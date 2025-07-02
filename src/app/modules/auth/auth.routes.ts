import express from 'express';
const router = express.Router();


router.get('/strava', (req, res) => {
  res.send('Strava OAuth login endpoint');
});


export const AuthRoutes = router;