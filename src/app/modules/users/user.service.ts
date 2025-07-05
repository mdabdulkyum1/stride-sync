import { User, Progress, DashboardData, AdminConfig } from '../../interface/types';
import admin from 'firebase-admin';

const db = admin.firestore();

export class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // CREATE - Create new user (REMOVED - Only Strava OAuth login allowed)
  // Users are created automatically when they authenticate with Strava

  // READ - Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const doc = await db.collection('users').doc(userId).get();
      
      if (doc.exists) {
        return doc.data() as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  // READ - Get user by email
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const snapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return doc.data() as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Failed to get user by email');
    }
  }

  // READ - Get user by Strava ID
  async getUserByStravaId(stravaId: string): Promise<User | null> {
    try {
      const snapshot = await db.collection('users')
        .where('stravaId', '==', stravaId)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return doc.data() as User;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by Strava ID:', error);
      throw new Error('Failed to get user by Strava ID');
    }
  }

  // READ - Get all users (for admin)
  async getAllUsers(options: {
    limit?: number;
    offset?: number;
    role?: string;
    isActive?: boolean;
  } = {}): Promise<User[]> {
    try {
      const { limit = 50, offset = 0, role, isActive } = options;
      
      let query = db.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset);

      if (role) {
        query = query.where('role', '==', role);
      }

      if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive);
      }

      const snapshot = await query.get();
      const users: User[] = [];

      snapshot.forEach(doc => {
        users.push(doc.data() as User);
      });

      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to get users');
    }
  }

  // UPDATE - Update user
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const userRef = db.collection('users').doc(userId);
      
      // Remove fields that shouldn't be updated
      const { id, createdAt, ...updateData } = updates;
      
      await userRef.update({
        ...updateData,
        lastLoginAt: Date.now(),
      });

      const updatedDoc = await userRef.get();
      return updatedDoc.data() as User;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // DELETE - Delete user (soft delete)
  async deleteUser(userId: string): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        isActive: false,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // HARD DELETE - Permanently delete user and all related data
  async hardDeleteUser(userId: string): Promise<void> {
    try {
      const batch = db.batch();
      
      // Delete user document
      batch.delete(db.collection('users').doc(userId));
      
      // Delete user activities
      const activitiesSnapshot = await db.collection('users').doc(userId).collection('activities').get();
      activitiesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete user progress
      const progressSnapshot = await db.collection('users').doc(userId).collection('progress').get();
      progressSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete user goals
      const goalsSnapshot = await db.collection('users').doc(userId).collection('goals').get();
      goalsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error hard deleting user:', error);
      throw new Error('Failed to hard delete user');
    }
  }

  // Get user dashboard data
  async getUserDashboard(userId: string): Promise<{
    totalActivities: number;
    totalDistance: number;
    monthlyProgress: number;
    averagePace: number;
    recentActivities: any[];
  }> {
    try {
      // Get user's activities
      const activitiesSnapshot = await db.collection('users').doc(userId).collection('activities')
        .orderBy('date', 'desc')
        .get();

      const activities = activitiesSnapshot.docs.map(doc => doc.data());
      
      // Calculate totals
      const totalActivities = activities.length;
      const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
      
      // Calculate average pace
      const activitiesWithPace = activities.filter(activity => activity.averagePace);
      const averagePace = activitiesWithPace.length > 0 
        ? activitiesWithPace.reduce((sum, activity) => sum + activity.averagePace, 0) / activitiesWithPace.length
        : 0;

      // Calculate monthly progress (simplified - assume 26.2km monthly goal)
      const monthlyGoal = 26.2;
      const monthlyProgress = Math.min((totalDistance / monthlyGoal) * 100, 100);

      // Get recent activities (last 5)
      const recentActivities = activities.slice(0, 5);

      return {
        totalActivities,
        totalDistance: Math.round(totalDistance * 100) / 100,
        monthlyProgress: Math.round(monthlyProgress),
        averagePace: Math.round(averagePace * 10) / 10,
        recentActivities,
      };
    } catch (error) {
      console.error('Error getting user dashboard:', error);
      throw new Error('Failed to get user dashboard');
    }
  }

  // Update user last login
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        lastLoginAt: Date.now(),
      });
    } catch (error) {
      console.error('Error updating last login:', error);
      throw new Error('Failed to update last login');
    }
  }

  // Get user count (for admin)
  async getUserCount(): Promise<number> {
    try {
      const snapshot = await db.collection('users').where('isActive', '==', true).get();
      return snapshot.size;
    } catch (error) {
      console.error('Error getting user count:', error);
      throw new Error('Failed to get user count');
    }
  }

  // Search users (for admin)
  async searchUsers(searchTerm: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<User[]> {
    try {
      const { limit = 20, offset = 0 } = options;
      
      // Note: Firestore doesn't support full-text search natively
      // This is a simple implementation - in production, consider using Algolia or similar
      const snapshot = await db.collection('users')
        .where('isActive', '==', true)
        .orderBy('name')
        .limit(limit)
        .offset(offset)
        .get();
      
      const users: User[] = [];
      
      snapshot.forEach(doc => {
        const user = doc.data() as User;
        if (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
          users.push(user);
        }
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }
} 