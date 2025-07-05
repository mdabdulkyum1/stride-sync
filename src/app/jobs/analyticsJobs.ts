import cron from 'node-cron';
import db from '../config/firebase';

// Generate daily analytics and insights
const generateDailyAnalytics = async () => {
  try {
    console.log('📈 Starting daily analytics generation...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999));

    // Get all activities from yesterday
    const activitiesSnapshot = await db.collection('activities')
      .where('startDate', '>=', startOfDay)
      .where('startDate', '<=', endOfDay)
      .get();

    const activities = activitiesSnapshot.docs.map(doc => doc.data());
    
    if (activities.length === 0) {
      console.log('ℹ️ No activities found for yesterday');
      return;
    }

    // Calculate analytics
    const analytics = calculateDailyAnalytics(activities);
    
    // Store analytics in database
    await db.collection('analytics').doc('daily').set({
      date: startOfDay,
      totalActivities: analytics.totalActivities,
      totalDistance: analytics.totalDistance,
      totalTime: analytics.totalTime,
      totalCalories: analytics.totalCalories,
      averageDistance: analytics.averageDistance,
      averageTime: analytics.averageTime,
      topActivityTypes: analytics.topActivityTypes,
      activeUsers: analytics.activeUsers,
      newUsers: analytics.newUsers,
      generatedAt: Date.now(),
    }, { merge: true });

    console.log(`✅ Daily analytics generated: ${analytics.totalActivities} activities from ${analytics.activeUsers} users`);
    
  } catch (error) {
    console.error('❌ Daily analytics generation failed:', error);
  }
};

// Calculate daily analytics from activities
const calculateDailyAnalytics = (activities: any[]) => {
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  const totalTime = activities.reduce((sum, activity) => sum + (activity.movingTime || 0), 0);
  const totalCalories = activities.reduce((sum, activity) => sum + (activity.kilojoules || 0), 0) * 0.239;

  // Get unique users
  const uniqueUsers = [...new Set(activities.map(activity => activity.userId))];
  
  // Count activity types
  const activityTypes = activities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topActivityTypes = Object.entries(activityTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    totalActivities,
    totalDistance,
    totalTime,
    totalCalories,
    averageDistance: totalActivities > 0 ? totalDistance / totalActivities : 0,
    averageTime: totalActivities > 0 ? totalTime / totalActivities : 0,
    topActivityTypes,
    activeUsers: uniqueUsers.length,
    newUsers: 0, // Would need to check user creation date
  };
};

// Generate weekly analytics report
const generateWeeklyAnalytics = async () => {
  try {
    console.log('📊 Starting weekly analytics generation...');
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Get all activities from the past week
    const activitiesSnapshot = await db.collection('activities')
      .where('startDate', '>', new Date(oneWeekAgo))
      .get();

    const activities = activitiesSnapshot.docs.map(doc => doc.data());
    
    if (activities.length === 0) {
      console.log('ℹ️ No activities found for the past week');
      return;
    }

    // Calculate weekly analytics
    const analytics = calculateWeeklyAnalytics(activities);
    
    // Store weekly analytics
    await db.collection('analytics').doc('weekly').set({
      weekStart: new Date(oneWeekAgo),
      totalActivities: analytics.totalActivities,
      totalDistance: analytics.totalDistance,
      totalTime: analytics.totalTime,
      totalCalories: analytics.totalCalories,
      averageActivitiesPerUser: analytics.averageActivitiesPerUser,
      topUsers: analytics.topUsers,
      activityTrends: analytics.activityTrends,
      generatedAt: Date.now(),
    }, { merge: true });

    console.log(`✅ Weekly analytics generated: ${analytics.totalActivities} activities from ${analytics.activeUsers} users`);
    
  } catch (error) {
    console.error('❌ Weekly analytics generation failed:', error);
  }
};

// Calculate weekly analytics
const calculateWeeklyAnalytics = (activities: any[]) => {
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  const totalTime = activities.reduce((sum, activity) => sum + (activity.movingTime || 0), 0);
  const totalCalories = activities.reduce((sum, activity) => sum + (activity.kilojoules || 0), 0) * 0.239;

  // Get unique users and their activity counts
  const userActivityCounts = activities.reduce((acc, activity) => {
    acc[activity.userId] = (acc[activity.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueUsers = Object.keys(userActivityCounts);
  const averageActivitiesPerUser = uniqueUsers.length > 0 ? totalActivities / uniqueUsers.length : 0;

  // Get top users by activity count
  const topUsers = Object.entries(userActivityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, count }));

  // Calculate daily trends
  const dailyTrends = activities.reduce((acc, activity) => {
    const date = new Date(activity.startDate).toDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activityTrends = Object.entries(dailyTrends)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, count]) => ({ date, count }));

  return {
    totalActivities,
    totalDistance,
    totalTime,
    totalCalories,
    activeUsers: uniqueUsers.length,
    averageActivitiesPerUser,
    topUsers,
    activityTrends,
  };
};

// Generate monthly analytics report
const generateMonthlyAnalytics = async () => {
  try {
    console.log('📈 Starting monthly analytics generation...');
    
    const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Get all activities from the past month
    const activitiesSnapshot = await db.collection('activities')
      .where('startDate', '>', new Date(oneMonthAgo))
      .get();

    const activities = activitiesSnapshot.docs.map(doc => doc.data());
    
    if (activities.length === 0) {
      console.log('ℹ️ No activities found for the past month');
      return;
    }

    // Calculate monthly analytics
    const analytics = calculateMonthlyAnalytics(activities);
    
    // Store monthly analytics
    await db.collection('analytics').doc('monthly').set({
      monthStart: new Date(oneMonthAgo),
      totalActivities: analytics.totalActivities,
      totalDistance: analytics.totalDistance,
      totalTime: analytics.totalTime,
      totalCalories: analytics.totalCalories,
      growthRate: analytics.growthRate,
      userRetention: analytics.userRetention,
      topPerformers: analytics.topPerformers,
      generatedAt: Date.now(),
    }, { merge: true });

    console.log(`✅ Monthly analytics generated: ${analytics.totalActivities} activities from ${analytics.activeUsers} users`);
    
  } catch (error) {
    console.error('❌ Monthly analytics generation failed:', error);
  }
};

// Calculate monthly analytics
const calculateMonthlyAnalytics = (activities: any[]) => {
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  const totalTime = activities.reduce((sum, activity) => sum + (activity.movingTime || 0), 0);
  const totalCalories = activities.reduce((sum, activity) => sum + (activity.kilojoules || 0), 0) * 0.239;

  // Get unique users
  const uniqueUsers = [...new Set(activities.map(activity => activity.userId))];

  // Calculate user performance
  const userPerformance = activities.reduce((acc, activity) => {
    if (!acc[activity.userId]) {
      acc[activity.userId] = {
        totalDistance: 0,
        totalTime: 0,
        totalActivities: 0,
      };
    }
    
    acc[activity.userId].totalDistance += activity.distance || 0;
    acc[activity.userId].totalTime += activity.movingTime || 0;
    acc[activity.userId].totalActivities += 1;
    
    return acc;
  }, {} as Record<string, any>);

  // Get top performers by distance
  const topPerformers = Object.entries(userPerformance)
    .sort(([,a], [,b]) => b.totalDistance - a.totalDistance)
    .slice(0, 10)
    .map(([userId, stats]) => ({ userId, ...stats }));

  return {
    totalActivities,
    totalDistance,
    totalTime,
    totalCalories,
    activeUsers: uniqueUsers.length,
    growthRate: 0, // Would need historical data to calculate
    userRetention: 0, // Would need historical data to calculate
    topPerformers,
  };
};

// Generate user engagement metrics
const generateUserEngagementMetrics = async () => {
  try {
    console.log('👥 Generating user engagement metrics...');
    
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .get();

    const engagementMetrics = {
      totalUsers: usersSnapshot.size,
      activeUsers: 0,
      newUsers: 0,
      returningUsers: 0,
      churnRate: 0,
      averageSessionDuration: 0,
      generatedAt: Date.now(),
    };

    // Calculate engagement metrics
    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      
      // Check if user has been active in the last 7 days
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (user.lastActivitySync && user.lastActivitySync > oneWeekAgo) {
        engagementMetrics.activeUsers++;
      }

      // Check if user is new (created in last 30 days)
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (user.createdAt && user.createdAt > oneMonthAgo) {
        engagementMetrics.newUsers++;
      }
    }

    // Store engagement metrics
    await db.collection('analytics').doc('engagement').set(engagementMetrics, { merge: true });

    console.log(`✅ User engagement metrics generated: ${engagementMetrics.activeUsers} active users out of ${engagementMetrics.totalUsers} total`);
    
  } catch (error) {
    console.error('❌ User engagement metrics generation failed:', error);
  }
};

// Schedule analytics jobs
// Daily analytics - every day at 1 AM UTC
cron.schedule('0 1 * * *', generateDailyAnalytics, {
  timezone: "UTC"
});

// Weekly analytics - every Monday at 2 AM UTC
cron.schedule('0 2 * * 1', generateWeeklyAnalytics, {
  timezone: "UTC"
});

// Monthly analytics - 1st of every month at 3 AM UTC
cron.schedule('0 3 1 * *', generateMonthlyAnalytics, {
  timezone: "UTC"
});

// User engagement metrics - every day at 4 AM UTC
cron.schedule('0 4 * * *', generateUserEngagementMetrics, {
  timezone: "UTC"
});

console.log('🕐 Analytics jobs scheduled:');
console.log('   - Daily analytics: Daily at 1 AM UTC');
console.log('   - Weekly analytics: Mondays at 2 AM UTC');
console.log('   - Monthly analytics: 1st of month at 3 AM UTC');
console.log('   - User engagement: Daily at 4 AM UTC');

export { 
  generateDailyAnalytics, 
  generateWeeklyAnalytics, 
  generateMonthlyAnalytics,
  generateUserEngagementMetrics 
}; 