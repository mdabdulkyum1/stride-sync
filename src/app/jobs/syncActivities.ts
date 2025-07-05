import cron from 'node-cron';
import axios from 'axios';
import config from '../config';
import db from '../config/firebase';

// Sync Strava activities for all users
const syncAllUsersActivities = async () => {
  try {
    console.log('🔄 Starting scheduled Strava activities sync...');
    
    // Get all users with Strava tokens
    const usersSnapshot = await db.collection('users')
      .where('stravaId', '!=', null)
      .where('isActive', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('ℹ️ No active users with Strava connected found');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      
      try {
        // Check if token is expired
        if (user.tokenExpiry && Date.now() > user.tokenExpiry) {
          console.log(`🔄 Refreshing token for user: ${user.email}`);
          await refreshStravaToken(user);
        }

        // Sync activities for this user
        await syncUserActivities(user);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error syncing activities for user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Sync completed: ${successCount} successful, ${errorCount} failed`);
    
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
  }
};

// Refresh Strava access token
const refreshStravaToken = async (user: any) => {
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: config.strava.clientId,
      client_secret: config.strava.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: user.refreshToken,
    });

    const { access_token, refresh_token, expires_at } = response.data;

    // Update user tokens in database
    await db.collection('users').doc(user.id).update({
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: expires_at * 1000, // Convert to milliseconds
      lastTokenRefresh: Date.now(),
    });

    console.log(`✅ Token refreshed for user: ${user.email}`);
    
  } catch (error) {
    console.error(`❌ Failed to refresh token for user ${user.email}:`, error);
    throw error;
  }
};

// Sync activities for a specific user
const syncUserActivities = async (user: any) => {
  try {
    // Get user's last activity sync time
    const lastSync = user.lastActivitySync || 0;
    const after = Math.floor(lastSync / 1000); // Convert to seconds

    // Fetch activities from Strava
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${user.accessToken}`,
      },
      params: {
        after,
        per_page: 200,
      },
    });

    const activities = response.data;
    
    if (activities.length === 0) {
      console.log(`ℹ️ No new activities for user: ${user.email}`);
      return;
    }

    // Save activities to database
    const batch = db.batch();
    
    for (const activity of activities) {
      const activityRef = db.collection('activities').doc(activity.id.toString());
      
      batch.set(activityRef, {
        id: activity.id.toString(),
        userId: user.id,
        stravaId: activity.id,
        name: activity.name,
        type: activity.type,
        distance: activity.distance,
        movingTime: activity.moving_time,
        elapsedTime: activity.elapsed_time,
        totalElevationGain: activity.total_elevation_gain,
        startDate: new Date(activity.start_date),
        startDateLocal: new Date(activity.start_date_local),
        averageSpeed: activity.average_speed,
        maxSpeed: activity.max_speed,
        averageCadence: activity.average_cadence,
        averageWatts: activity.average_watts,
        weightedAverageWatts: activity.weighted_average_watts,
        kilojoules: activity.kilojoules,
        averageHeartrate: activity.average_heartrate,
        maxHeartrate: activity.max_heartrate,
        elevHigh: activity.elev_high,
        elevLow: activity.elev_low,
        uploadId: activity.upload_id,
        externalId: activity.external_id,
        trainer: activity.trainer,
        commute: activity.commute,
        manual: activity.manual,
        private: activity.private,
        flagged: activity.flagged,
        workoutType: activity.workout_type,
        uploadIdStr: activity.upload_id_str,
        averageTemp: activity.average_temp,
        hasKudoed: activity.has_kudoed,
        syncedAt: Date.now(),
      }, { merge: true });
    }

    await batch.commit();

    // Update user's last sync time
    await db.collection('users').doc(user.id).update({
      lastActivitySync: Date.now(),
      lastSyncCount: activities.length,
    });

    console.log(`✅ Synced ${activities.length} activities for user: ${user.email}`);
    
  } catch (error) {
    console.error(`❌ Error syncing activities for user ${user.email}:`, error);
    throw error;
  }
};

// Schedule the sync job to run every hour
cron.schedule('0 * * * *', syncAllUsersActivities, {
  timezone: "UTC"
});

console.log('🕐 Strava activities sync scheduled to run every hour');

export { syncAllUsersActivities, syncUserActivities };