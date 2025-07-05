import cron from 'node-cron';
import db from '../config/firebase';

// Send weekly progress reports to users
const sendWeeklyProgressReports = async () => {
  try {
    console.log('📊 Starting weekly progress reports...');
    
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .where('email', '!=', null)
      .get();

    if (usersSnapshot.empty) {
      console.log('ℹ️ No active users found for progress reports');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      
      try {
        const weeklyStats = await generateWeeklyStats(user.id);
        
        if (weeklyStats.totalActivities > 0) {
          await sendProgressEmail(user, weeklyStats);
          successCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error sending progress report to ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Weekly reports sent: ${successCount} successful, ${errorCount} failed`);
    
  } catch (error) {
    console.error('❌ Weekly progress reports failed:', error);
  }
};

// Generate weekly statistics for a user
const generateWeeklyStats = async (userId: string) => {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const activitiesSnapshot = await db.collection('activities')
    .where('userId', '==', userId)
    .where('startDate', '>', new Date(oneWeekAgo))
    .get();

  const activities = activitiesSnapshot.docs.map(doc => doc.data());
  
  const totalActivities = activities.length;
  const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
  const totalTime = activities.reduce((sum, activity) => sum + (activity.movingTime || 0), 0);
  const totalCalories = activities.reduce((sum, activity) => sum + (activity.kilojoules || 0), 0) * 0.239; // Convert kJ to kcal

  return {
    totalActivities,
    totalDistance,
    totalTime,
    totalCalories,
    averageDistance: totalActivities > 0 ? totalDistance / totalActivities : 0,
    averageTime: totalActivities > 0 ? totalTime / totalActivities : 0,
  };
};

// Send progress email to user
const sendProgressEmail = async (user: any, stats: any) => {
  // This would integrate with your email service (SendGrid, AWS SES, etc.)
  console.log(`📧 Sending progress report to ${user.email}`);
  console.log(`📊 Weekly stats: ${stats.totalActivities} activities, ${Math.round(stats.totalDistance / 1000)}km, ${Math.round(stats.totalTime / 60)} minutes`);
  
  // Example email content
  const emailContent = {
    to: user.email,
    subject: 'Your Weekly Fitness Progress Report',
    html: `
      <h2>Your Weekly Progress Report</h2>
      <p>Hi ${user.name},</p>
      <p>Here's your fitness summary for this week:</p>
      <ul>
        <li>Activities: ${stats.totalActivities}</li>
        <li>Total Distance: ${Math.round(stats.totalDistance / 1000)}km</li>
        <li>Total Time: ${Math.round(stats.totalTime / 60)} minutes</li>
        <li>Calories Burned: ${Math.round(stats.totalCalories)} kcal</li>
      </ul>
      <p>Keep up the great work! 🏃‍♂️</p>
    `
  };

  // TODO: Integrate with email service
  // await sendEmail(emailContent);
};

// Send motivational reminders to inactive users
const sendMotivationalReminders = async () => {
  try {
    console.log('💪 Starting motivational reminders...');
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const inactiveUsersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .where('lastActivitySync', '<', oneWeekAgo)
      .where('email', '!=', null)
      .get();

    if (inactiveUsersSnapshot.empty) {
      console.log('ℹ️ No inactive users found for reminders');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const userDoc of inactiveUsersSnapshot.docs) {
      const user = userDoc.data();
      
      try {
        await sendMotivationalEmail(user);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error sending motivational email to ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Motivational reminders sent: ${successCount} successful, ${errorCount} failed`);
    
  } catch (error) {
    console.error('❌ Motivational reminders failed:', error);
  }
};

// Send motivational email to inactive user
const sendMotivationalEmail = async (user: any) => {
  console.log(`💌 Sending motivational email to ${user.email}`);
  
  const emailContent = {
    to: user.email,
    subject: 'Missing You on the Track! 🏃‍♂️',
    html: `
      <h2>Hey ${user.name}!</h2>
      <p>We noticed you haven't been active lately. Don't let your fitness goals slip away!</p>
      <p>Remember why you started - every step counts towards your goals.</p>
      <p>Ready to get back on track? Sync your Strava activities and see your progress!</p>
      <p>Stay motivated! 💪</p>
    `
  };

  // TODO: Integrate with email service
  // await sendEmail(emailContent);
};

// Send goal achievement notifications
const checkGoalAchievements = async () => {
  try {
    console.log('🎯 Checking goal achievements...');
    
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      
      try {
        await checkUserGoals(user);
        
      } catch (error) {
        console.error(`❌ Error checking goals for ${user.email}:`, error);
      }
    }

    console.log('✅ Goal achievement check completed');
    
  } catch (error) {
    console.error('❌ Goal achievement check failed:', error);
  }
};

// Check if user has achieved any goals
const checkUserGoals = async (user: any) => {
  // Get user's goals from database
  const goalsSnapshot = await db.collection('goals')
    .where('userId', '==', user.id)
    .where('achieved', '==', false)
    .get();

  for (const goalDoc of goalsSnapshot.docs) {
    const goal = goalDoc.data();
    
    // Check if goal is achieved based on user's activities
    const isAchieved = await checkGoalAchievement(user.id, goal);
    
    if (isAchieved) {
      await db.collection('goals').doc(goal.id).update({
        achieved: true,
        achievedAt: Date.now(),
      });

      // Send achievement notification
      await sendAchievementEmail(user, goal);
    }
  }
};

// Check if a specific goal is achieved
const checkGoalAchievement = async (userId: string, goal: any) => {
  const startDate = new Date(goal.startDate);
  const endDate = new Date(goal.endDate);
  
  const activitiesSnapshot = await db.collection('activities')
    .where('userId', '==', userId)
    .where('startDate', '>=', startDate)
    .where('startDate', '<=', endDate)
    .get();

  const activities = activitiesSnapshot.docs.map(doc => doc.data());
  
  switch (goal.type) {
    case 'distance':
      const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
      return totalDistance >= goal.target;
      
    case 'activities':
      return activities.length >= goal.target;
      
    case 'time':
      const totalTime = activities.reduce((sum, activity) => sum + (activity.movingTime || 0), 0);
      return totalTime >= goal.target;
      
    default:
      return false;
  }
};

// Send achievement email
const sendAchievementEmail = async (user: any, goal: any) => {
  console.log(`🏆 Sending achievement email to ${user.email} for goal: ${goal.name}`);
  
  const emailContent = {
    to: user.email,
    subject: '🎉 Goal Achieved! Congratulations!',
    html: `
      <h2>Congratulations ${user.name}! 🎉</h2>
      <p>You've achieved your goal: <strong>${goal.name}</strong></p>
      <p>Target: ${goal.target} ${goal.type}</p>
      <p>Keep pushing your limits! You're doing amazing!</p>
    `
  };

  // TODO: Integrate with email service
  // await sendEmail(emailContent);
};

// Schedule jobs
// Weekly progress reports - every Sunday at 9 AM UTC
cron.schedule('0 9 * * 0', sendWeeklyProgressReports, {
  timezone: "UTC"
});

// Motivational reminders - every Tuesday and Thursday at 10 AM UTC
cron.schedule('0 10 * * 2,4', sendMotivationalReminders, {
  timezone: "UTC"
});

// Goal achievement checks - daily at 6 AM UTC
cron.schedule('0 6 * * *', checkGoalAchievements, {
  timezone: "UTC"
});

console.log('🕐 Notification jobs scheduled:');
console.log('   - Weekly reports: Sundays at 9 AM UTC');
console.log('   - Motivational reminders: Tuesdays & Thursdays at 10 AM UTC');
console.log('   - Goal checks: Daily at 6 AM UTC');

export { 
  sendWeeklyProgressReports, 
  sendMotivationalReminders, 
  checkGoalAchievements,
  generateWeeklyStats 
}; 