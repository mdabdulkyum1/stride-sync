import cron from 'node-cron';
import db from '../config/firebase';

// Cleanup old data and maintain database performance
const cleanupOldData = async () => {
  try {
    console.log('🧹 Starting scheduled cleanup job...');
    
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Cleanup old activity logs (older than 30 days)
    const oldActivitiesSnapshot = await db.collection('activities')
      .where('syncedAt', '<', thirtyDaysAgo)
      .limit(1000) // Process in batches
      .get();

    if (!oldActivitiesSnapshot.empty) {
      const batch = db.batch();
      oldActivitiesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Cleaned up ${oldActivitiesSnapshot.size} old activities`);
    }

    // Cleanup old user sessions (older than 7 days)
    const oldSessionsSnapshot = await db.collection('sessions')
      .where('createdAt', '<', sevenDaysAgo)
      .limit(500)
      .get();

    if (!oldSessionsSnapshot.empty) {
      const batch = db.batch();
      oldSessionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Cleaned up ${oldSessionsSnapshot.size} old sessions`);
    }

    // Cleanup old error logs (older than 7 days)
    const oldErrorLogsSnapshot = await db.collection('errorLogs')
      .where('timestamp', '<', sevenDaysAgo)
      .limit(500)
      .get();

    if (!oldErrorLogsSnapshot.empty) {
      const batch = db.batch();
      oldErrorLogsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ Cleaned up ${oldErrorLogsSnapshot.size} old error logs`);
    }

    // Update user statistics
    await updateUserStatistics();

    console.log('✅ Cleanup job completed successfully');
    
  } catch (error) {
    console.error('❌ Cleanup job failed:', error);
  }
};

// Update user statistics and analytics
const updateUserStatistics = async () => {
  try {
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      
      // Get user's activity count
      const activitiesSnapshot = await db.collection('activities')
        .where('userId', '==', user.id)
        .get();

      // Get user's total distance
      const totalDistance = activitiesSnapshot.docs.reduce((total, doc) => {
        return total + (doc.data().distance || 0);
      }, 0);

      // Get user's total time
      const totalTime = activitiesSnapshot.docs.reduce((total, doc) => {
        return total + (doc.data().movingTime || 0);
      }, 0);

      // Update user statistics
      await db.collection('users').doc(user.id).update({
        totalActivities: activitiesSnapshot.size,
        totalDistance,
        totalTime,
        lastStatsUpdate: Date.now(),
      });
    }

    console.log(`📊 Updated statistics for ${usersSnapshot.size} users`);
    
  } catch (error) {
    console.error('❌ Failed to update user statistics:', error);
  }
};

// Schedule cleanup job to run daily at 2 AM UTC
cron.schedule('0 2 * * *', cleanupOldData, {
  timezone: "UTC"
});

console.log('🕐 Cleanup job scheduled to run daily at 2 AM UTC');

export { cleanupOldData, updateUserStatistics }; 