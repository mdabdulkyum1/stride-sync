import cron from 'node-cron';
// import { stravaApi } from '../config/strava';

cron.schedule('0 0 * * *', async () => {
  console.log('Syncing Strava activities...');
  // Add logic to fetch and store activities
});