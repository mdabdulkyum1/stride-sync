import { StravaActivity, ActivitySummary, Progress, Goal, MonthlyGoal, SeasonalGoal } from '../../interface/types';
import { stravaApi } from '../../config/strava';
import admin from 'firebase-admin';
import { AuthService } from '../auth/authService';

const db = admin.firestore();
const authService = AuthService.getInstance();

export class ActivityService {
  private static instance: ActivityService;

  private constructor() {}

  public static getInstance(): ActivityService {
    if (!ActivityService.instance) {
      ActivityService.instance = new ActivityService();
    }
    return ActivityService.instance;
  }

  // Convert meters to miles
  private metersToMiles(meters: number): number {
    return meters * 0.000621371;
  }

  // Convert seconds to minutes
  private secondsToMinutes(seconds: number): number {
    return seconds / 60;
  }

  // Calculate pace (minutes per mile)
  private calculatePace(distanceMiles: number, durationMinutes: number): number {
    return distanceMiles > 0 ? durationMinutes / distanceMiles : 0;
  }

  // Convert Strava activity to ActivitySummary
  private convertToActivitySummary(activity: StravaActivity): ActivitySummary {
    const distanceMiles = this.metersToMiles(activity.distance);
    const durationMinutes = this.secondsToMinutes(activity.moving_time);
    const pace = this.calculatePace(distanceMiles, durationMinutes);
    const elevationFeet = activity.total_elevation_gain * 3.28084; // meters to feet

    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: distanceMiles,
      duration: durationMinutes,
      date: activity.start_date,
      pace: pace,
      elevation: elevationFeet,
      calories: activity.calories,
      route: activity.map?.summary_polyline,
    };
  }

  // CREATE - Sync activities from Strava
  async syncActivities(userId: string): Promise<{ synced: number; total: number }> {
    try {
      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      // Get activities from Strava
      const response = await stravaApi.get('/athlete/activities', {
        params: {
          per_page: 200,
          page: 1,
        },
      });

      const activities: StravaActivity[] = response.data;
      let syncedCount = 0;

      // Process each activity
      for (const activity of activities) {
        if (['Run', 'Walk', 'Hike'].includes(activity.type)) {
          const activityRef = db.collection('users').doc(userId).collection('activities').doc(activity.id.toString());
          
          // Check if activity already exists
          const existing = await activityRef.get();
          if (!existing.exists) {
            const activitySummary = this.convertToActivitySummary(activity);
            await activityRef.set({
              ...activitySummary,
              syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            syncedCount++;
          }
        }
      }

      // Update user progress
      await this.updateUserProgress(userId);

      return { synced: syncedCount, total: activities.length };
    } catch (error) {
      console.error('Error syncing activities:', error);
      throw new Error('Failed to sync activities');
    }
  }

  // READ - Get user activities
  async getUserActivities(userId: string, options: {
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<ActivitySummary[]> {
    try {
      const { limit = 50, offset = 0, type, startDate, endDate } = options;
      
      let query = db.collection('users').doc(userId).collection('activities')
        .orderBy('date', 'desc')
        .limit(limit)
        .offset(offset);

      if (type) {
        query = query.where('type', '==', type);
      }

      if (startDate) {
        query = query.where('date', '>=', startDate);
      }

      if (endDate) {
        query = query.where('date', '<=', endDate);
      }

      const snapshot = await query.get();
      const activities: ActivitySummary[] = [];

      snapshot.forEach(doc => {
        activities.push(doc.data() as ActivitySummary);
      });

      return activities;
    } catch (error) {
      console.error('Error getting user activities:', error);
      throw new Error('Failed to get activities');
    }
  }

  // READ - Get single activity
  async getActivity(userId: string, activityId: number): Promise<ActivitySummary | null> {
    try {
      const doc = await db.collection('users').doc(userId).collection('activities').doc(activityId.toString()).get();
      
      if (doc.exists) {
        return doc.data() as ActivitySummary;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting activity:', error);
      throw new Error('Failed to get activity');
    }
  }

  // UPDATE - Update activity (manual edit)
  async updateActivity(userId: string, activityId: number, updates: Partial<ActivitySummary>): Promise<ActivitySummary> {
    try {
      const activityRef = db.collection('users').doc(userId).collection('activities').doc(activityId.toString());
      
      // Remove fields that shouldn't be updated
      const { id, ...updateData } = updates;
      
      await activityRef.update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user progress
      await this.updateUserProgress(userId);

      const updatedDoc = await activityRef.get();
      return updatedDoc.data() as ActivitySummary;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw new Error('Failed to update activity');
    }
  }

  // DELETE - Delete activity
  async deleteActivity(userId: string, activityId: number): Promise<void> {
    try {
      await db.collection('users').doc(userId).collection('activities').doc(activityId.toString()).delete();
      
      // Update user progress
      await this.updateUserProgress(userId);
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw new Error('Failed to delete activity');
    }
  }

  // Calculate user progress
  async updateUserProgress(userId: string): Promise<Progress> {
    try {
      const activities = await this.getUserActivities(userId, { limit: 1000 });
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      // Calculate monthly mileage
      const monthlyActivities = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate.getMonth() + 1 === currentMonth && 
               activityDate.getFullYear() === currentYear;
      });
      
      const monthlyMileage = monthlyActivities.reduce((sum, activity) => sum + activity.distance, 0);
      
      // Calculate seasonal mileage
      const currentSeason = this.getCurrentSeason();
      const seasonalActivities = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        return this.isInSeason(activityDate, currentSeason);
      });
      
      const seasonalMileage = seasonalActivities.reduce((sum, activity) => sum + activity.distance, 0);
      
      // Calculate averages
      const totalActivities = activities.length;
      const averagePace = activities.length > 0 
        ? activities.reduce((sum, activity) => sum + (activity.pace || 0), 0) / activities.length 
        : 0;
      
      const longestRun = Math.max(...activities.map(activity => activity.distance), 0);
      
      // Get or create goals
      const monthlyGoal = await this.getOrCreateMonthlyGoal(userId, currentMonth, currentYear);
      const seasonalGoal = await this.getOrCreateSeasonalGoal(userId, currentSeason, currentYear);
      
      const progress: Progress = {
        userId,
        monthlyMileage,
        seasonalMileage,
        monthlyGoal: monthlyGoal.target,
        seasonalGoal: seasonalGoal.target,
        monthlyProgress: (monthlyMileage / monthlyGoal.target) * 100,
        seasonalProgress: (seasonalMileage / seasonalGoal.target) * 100,
        lastUpdated: Date.now(),
        totalActivities,
        averagePace,
        longestRun,
      };
      
      // Save progress
      await db.collection('users').doc(userId).collection('progress').doc('current').set(progress);
      
      return progress;
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw new Error('Failed to update progress');
    }
  }

  // Get user progress
  async getUserProgress(userId: string): Promise<Progress | null> {
    try {
      const doc = await db.collection('users').doc(userId).collection('progress').doc('current').get();
      
      if (doc.exists) {
        return doc.data() as Progress;
      }
      
      // If no progress exists, create it
      return await this.updateUserProgress(userId);
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw new Error('Failed to get progress');
    }
  }

  // Goal management
  async getOrCreateMonthlyGoal(userId: string, month: number, year: number): Promise<MonthlyGoal> {
    try {
      const goalRef = db.collection('users').doc(userId).collection('goals').doc(`monthly_${year}_${month}`);
      const doc = await goalRef.get();
      
      if (doc.exists) {
        return doc.data() as MonthlyGoal;
      }
      
      // Create default monthly goal
      const defaultGoal: MonthlyGoal = {
        id: `monthly_${year}_${month}`,
        userId,
        type: 'monthly',
        target: 26.2,
        current: 0,
        startDate: new Date(year, month - 1, 1).toISOString(),
        endDate: new Date(year, month, 0).toISOString(),
        isCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        month,
        year,
      };
      
      await goalRef.set(defaultGoal);
      return defaultGoal;
    } catch (error) {
      console.error('Error creating monthly goal:', error);
      throw new Error('Failed to create monthly goal');
    }
  }

  async getOrCreateSeasonalGoal(userId: string, season: string, year: number): Promise<SeasonalGoal> {
    try {
      const goalRef = db.collection('users').doc(userId).collection('goals').doc(`seasonal_${year}_${season}`);
      const doc = await goalRef.get();
      
      if (doc.exists) {
        return doc.data() as SeasonalGoal;
      }
      
      // Create default seasonal goal
      const defaultGoal: SeasonalGoal = {
        id: `seasonal_${year}_${season}`,
        userId,
        type: 'seasonal',
        target: 78.6,
        current: 0,
        startDate: this.getSeasonStartDate(season, year),
        endDate: this.getSeasonEndDate(season, year),
        isCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        season: season as 'Spring' | 'Summer' | 'Fall' | 'Winter',
        year,
      };
      
      await goalRef.set(defaultGoal);
      return defaultGoal;
    } catch (error) {
      console.error('Error creating seasonal goal:', error);
      throw new Error('Failed to create seasonal goal');
    }
  }

  // Helper methods for seasons
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  private isInSeason(date: Date, season: string): boolean {
    const month = date.getMonth() + 1;
    switch (season) {
      case 'Spring': return month >= 3 && month <= 5;
      case 'Summer': return month >= 6 && month <= 8;
      case 'Fall': return month >= 9 && month <= 11;
      case 'Winter': return month === 12 || month <= 2;
      default: return false;
    }
  }

  private getSeasonStartDate(season: string, year: number): string {
    const startMonths = { Spring: 3, Summer: 6, Fall: 9, Winter: 12 };
    const startMonth = startMonths[season as keyof typeof startMonths] || 1;
    return new Date(year, startMonth - 1, 1).toISOString();
  }

  private getSeasonEndDate(season: string, year: number): string {
    const endMonths = { Spring: 5, Summer: 8, Fall: 11, Winter: 2 };
    const endMonth = endMonths[season as keyof typeof endMonths] || 12;
    const endYear = season === 'Winter' ? year + 1 : year;
    return new Date(endYear, endMonth, 0).toISOString();
  }
} 