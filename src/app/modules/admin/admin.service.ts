import { AdminConfig, UserExportData, AdminExportData, ExportOptions, Analytics, User, Progress } from '../../interface/types';
import admin from 'firebase-admin';
import { exportToCSV } from '../../utils/csvExport';

const db = admin.firestore();

export class AdminService {
  private static instance: AdminService;

  private constructor() {}

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // CREATE - Create admin configuration
  async createAdminConfig(config: Partial<AdminConfig>): Promise<AdminConfig> {
    try {
      const defaultConfig: AdminConfig = {
        motivationalText: 'Keep pushing your limits!',
        dashboardTitle: 'Your Fitness Journey',
        brandLogo: {
          url: '',
          altText: 'Brand Logo',
        },
        goals: {
          defaultMonthly: 26.2,
          defaultSeasonal: 78.6,
        },
        features: {
          showRecentActivities: true,
          showAchievements: true,
          showPace: true,
          showCalories: true,
        },
        shopify: {
          enabled: false,
        },
      };

      const newConfig: AdminConfig = {
        ...defaultConfig,
        ...config,
      };

      await db.collection('admin').doc('config').set(newConfig);
      return newConfig;
    } catch (error) {
      console.error('Error creating admin config:', error);
      throw new Error('Failed to create admin config');
    }
  }

  // READ - Get admin configuration
  async getAdminConfig(): Promise<AdminConfig | null> {
    try {
      const doc = await db.collection('admin').doc('config').get();
      
      if (doc.exists) {
        return doc.data() as AdminConfig;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting admin config:', error);
      throw new Error('Failed to get admin config');
    }
  }

  // UPDATE - Update admin configuration
  async updateAdminConfig(updates: Partial<AdminConfig>): Promise<AdminConfig> {
    try {
      const configRef = db.collection('admin').doc('config');
      
      await configRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updatedDoc = await configRef.get();
      return updatedDoc.data() as AdminConfig;
    } catch (error) {
      console.error('Error updating admin config:', error);
      throw new Error('Failed to update admin config');
    }
  }

  // Export users data
  async exportUsersData(options: ExportOptions): Promise<AdminExportData> {
    try {
      const { format = 'csv', filters = {}, includeFields = [] } = options;
      
      // Get all users
      const usersSnapshot = await db.collection('users')
        .where('isActive', '==', true)
        .get();
      
      const users: User[] = [];
      usersSnapshot.forEach(doc => {
        users.push(doc.data() as User);
      });

      // Get progress for each user
      const userExportData: UserExportData[] = [];
      let goalAchievers = 0;

      for (const user of users) {
        const progressDoc = await db.collection('users').doc(user.id).collection('progress').doc('current').get();
        const progress = progressDoc.exists ? progressDoc.data() as Progress : null;

        // Get last activity date
        const activitiesSnapshot = await db.collection('users').doc(user.id).collection('activities')
          .orderBy('date', 'desc')
          .limit(1)
          .get();
        
        const lastActivityDate = activitiesSnapshot.empty ? undefined : activitiesSnapshot.docs[0].data().date;

        const userData: UserExportData = {
          id: user.id,
          name: user.name,
          email: user.email,
          monthlyMileage: progress?.monthlyMileage || 0,
          seasonalMileage: progress?.seasonalMileage || 0,
          monthlyGoalMet: (progress?.monthlyMileage || 0) >= 26.2,
          seasonalGoalMet: (progress?.seasonalMileage || 0) >= 78.6,
          lastActivityDate,
          joinDate: new Date(user.createdAt).toISOString(),
          shopifyCustomerId: user.shopifyCustomerId,
          totalActivities: progress?.totalActivities || 0,
          averagePace: progress?.averagePace || 0,
        };

        // Apply filters
        let includeUser = true;
        
        if (filters.goalMet !== undefined) {
          if (filters.goalMet && !userData.seasonalGoalMet) {
            includeUser = false;
          } else if (!filters.goalMet && userData.seasonalGoalMet) {
            includeUser = false;
          }
        }

        if (filters.season) {
          // Filter by season logic would go here
          // For now, we'll include all users
        }

        if (includeUser) {
          userExportData.push(userData);
          if (userData.seasonalGoalMet) {
            goalAchievers++;
          }
        }
      }

      const exportData: AdminExportData = {
        users: userExportData,
        totalUsers: userExportData.length,
        goalAchievers,
        exportDate: new Date().toISOString(),
        season: this.getCurrentSeason(),
        year: new Date().getFullYear(),
      };

      return exportData;
    } catch (error) {
      console.error('Error exporting users data:', error);
      throw new Error('Failed to export users data');
    }
  }

  // Generate CSV export
  async generateCSVExport(exportData: AdminExportData, options: ExportOptions): Promise<string> {
    try {
      const { includeFields = [] } = options;
      
      // Define default fields to include
      const defaultFields = [
        'name',
        'email',
        'monthlyMileage',
        'seasonalMileage',
        'monthlyGoalMet',
        'seasonalGoalMet',
        'lastActivityDate',
        'joinDate',
      ];

      const fieldsToInclude = includeFields.length > 0 ? includeFields : defaultFields;
      
      // Filter data based on included fields
      const filteredData = exportData.users.map(user => {
        const filteredUser: any = {};
        fieldsToInclude.forEach(field => {
          if (user[field as keyof UserExportData] !== undefined) {
            filteredUser[field] = user[field as keyof UserExportData];
          }
        });
        return filteredUser;
      });

      // Generate CSV
      const csv = await exportToCSV(filteredData, fieldsToInclude);

      return csv as string;
    } catch (error) {
      console.error('Error generating CSV export:', error);
      throw new Error('Failed to generate CSV export');
    }
  }

  // Get analytics
  async getAnalytics(): Promise<Analytics> {
    try {
      // Get total users
      const usersSnapshot = await db.collection('users').where('isActive', '==', true).get();
      const totalUsers = usersSnapshot.size;

      // Get active users (users with login in last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const activeUsersSnapshot = await db.collection('users')
        .where('isActive', '==', true)
        .where('lastLoginAt', '>=', thirtyDaysAgo)
        .get();
      const activeUsers = activeUsersSnapshot.size;

      // Calculate total mileage and averages
      let totalMileage = 0;
      let totalMonthlyMileage = 0;
      let goalCompletionCount = 0;
      const activityBreakdown = { run: 0, walk: 0, hike: 0, other: 0 };

      for (const userDoc of usersSnapshot.docs) {
        const progressDoc = await db.collection('users').doc(userDoc.id).collection('progress').doc('current').get();
        if (progressDoc.exists) {
          const progress = progressDoc.data() as Progress;
          totalMileage += progress.seasonalMileage;
          totalMonthlyMileage += progress.monthlyMileage;
          if (progress.seasonalMileage >= 78.6) {
            goalCompletionCount++;
          }
        }

        // Get activity breakdown
        const activitiesSnapshot = await db.collection('users').doc(userDoc.id).collection('activities').get();
        activitiesSnapshot.forEach(activityDoc => {
          const activity = activityDoc.data();
          const type = activity.type?.toLowerCase();
          if (type === 'run') activityBreakdown.run++;
          else if (type === 'walk') activityBreakdown.walk++;
          else if (type === 'hike') activityBreakdown.hike++;
          else activityBreakdown.other++;
        });
      }

      const averageMonthlyMileage = totalUsers > 0 ? totalMonthlyMileage / totalUsers : 0;
      const goalCompletionRate = totalUsers > 0 ? (goalCompletionCount / totalUsers) * 100 : 0;

      // Get top performers
      const topPerformers: UserExportData[] = [];
      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data() as User;
        const progressDoc = await db.collection('users').doc(user.id).collection('progress').doc('current').get();
        if (progressDoc.exists) {
          const progress = progressDoc.data() as Progress;
          topPerformers.push({
            id: user.id,
            name: user.name,
            email: user.email,
            monthlyMileage: progress.monthlyMileage,
            seasonalMileage: progress.seasonalMileage,
            monthlyGoalMet: progress.monthlyMileage >= 26.2,
            seasonalGoalMet: progress.seasonalMileage >= 78.6,
            joinDate: new Date(user.createdAt).toISOString(),
            totalActivities: progress.totalActivities,
            averagePace: progress.averagePace,
          });
        }
      }

      // Sort by seasonal mileage and take top 10
      topPerformers.sort((a, b) => b.seasonalMileage - a.seasonalMileage);
      const top10Performers = topPerformers.slice(0, 10);

      const analytics: Analytics = {
        totalUsers,
        activeUsers,
        totalMileage,
        averageMonthlyMileage,
        goalCompletionRate,
        topPerformers: top10Performers,
        activityBreakdown,
        seasonalStats: {
          spring: 0, // Would need to calculate based on season
          summer: 0,
          fall: 0,
          winter: 0,
        },
        engagement: {
          dailyActiveUsers: 0, // Would need to calculate based on login data
          weeklyActiveUsers: 0,
          monthlyActiveUsers: activeUsers,
        },
      };

      return analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw new Error('Failed to get analytics');
    }
  }

  // Update motivational text
  async updateMotivationalText(text: string): Promise<void> {
    try {
      await db.collection('admin').doc('config').update({
        motivationalText: text,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating motivational text:', error);
      throw new Error('Failed to update motivational text');
    }
  }

  // Update brand logo
  async updateBrandLogo(logoData: { url: string; altText: string; width?: number; height?: number }): Promise<void> {
    try {
      await db.collection('admin').doc('config').update({
        'brandLogo': logoData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating brand logo:', error);
      throw new Error('Failed to update brand logo');
    }
  }

  // Update goals
  async updateGoals(goals: { defaultMonthly?: number; defaultSeasonal?: number }): Promise<void> {
    try {
      await db.collection('admin').doc('config').update({
        'goals': goals,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating goals:', error);
      throw new Error('Failed to update goals');
    }
  }

  // Update features
  async updateFeatures(features: {
    showRecentActivities?: boolean;
    showAchievements?: boolean;
    showPace?: boolean;
    showCalories?: boolean;
  }): Promise<void> {
    try {
      await db.collection('admin').doc('config').update({
        'features': features,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating features:', error);
      throw new Error('Failed to update features');
    }
  }

  // Helper method to get current season
  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalActivities: number;
    totalDistance: number;
    activeUsers: number;
    newUsersThisMonth: number;
  }> {
    try {
      // Get total users
      const usersSnapshot = await db.collection('users').get();
      const totalUsers = usersSnapshot.size;

      // Get active users (users with activities in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeUsersSnapshot = await db.collection('users')
        .where('lastActivityAt', '>=', thirtyDaysAgo)
        .get();
      const activeUsers = activeUsersSnapshot.size;

      // Get new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const newUsersSnapshot = await db.collection('users')
        .where('createdAt', '>=', startOfMonth)
        .get();
      const newUsersThisMonth = newUsersSnapshot.size;

      // Get total activities and distance
      let totalActivities = 0;
      let totalDistance = 0;

      const activitiesSnapshot = await db.collectionGroup('activities').get();
      activitiesSnapshot.forEach(doc => {
        const activity = doc.data();
        totalActivities++;
        totalDistance += activity.distance || 0;
      });

      return {
        totalUsers,
        totalActivities,
        totalDistance: Math.round(totalDistance * 100) / 100, // Round to 2 decimal places
        activeUsers,
        newUsersThisMonth,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw new Error('Failed to get dashboard stats');
    }
  }

  // Get user registrations chart data (last 30 days)
  async getUserRegistrationsChart(): Promise<{
    dates: string[];
    registrations: number[];
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const usersSnapshot = await db.collection('users')
        .where('createdAt', '>=', thirtyDaysAgo)
        .orderBy('createdAt', 'asc')
        .get();

      // Group users by date
      const registrationsByDate: { [key: string]: number } = {};
      
      // Initialize all dates in the last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        registrationsByDate[dateStr] = 0;
      }

      // Count registrations by date
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        const createdAt = user.createdAt?.toDate?.() || new Date(user.createdAt);
        const dateStr = createdAt.toISOString().split('T')[0];
        
        if (registrationsByDate[dateStr] !== undefined) {
          registrationsByDate[dateStr]++;
        }
      });

      const dates = Object.keys(registrationsByDate).sort();
      const registrations = dates.map(date => registrationsByDate[date]);

      return {
        dates,
        registrations,
      };
    } catch (error) {
      console.error('Error getting user registrations chart:', error);
      throw new Error('Failed to get user registrations chart');
    }
  }

  // Get all users with pagination and filters
  async getAllUsers(options: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page, limit, search, role, isActive } = options;
      
      let query: any = db.collection('users');

      // Apply filters
      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      }
      
      if (role) {
        query = query.where('role', '==', role);
      }

      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const usersSnapshot = await query.get();
      const users: User[] = [];
      
      usersSnapshot.forEach((doc: any) => {
        const user = doc.data() as User;
        user.id = doc.id;
        users.push(user);
      });

      // Apply search filter if provided
      let filteredUsers = users;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = users.filter(user => 
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        );
      }

      const totalPages = Math.ceil(total / limit);

      return {
        users: filteredUsers,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to get all users');
    }
  }
} 