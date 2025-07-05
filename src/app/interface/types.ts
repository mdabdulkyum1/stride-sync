// User and Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: number;
  stravaId?: string;
  profilePicture?: string;
  shopifyCustomerId?: string; // For Shopify integration
  isActive: boolean;
  lastLoginAt?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  refreshTokenExpiresAt?: number;
}

export interface StravaUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  profile?: string;
  weight?: number;
  height?: number;
}

// Activity and Mileage Types
export interface StravaActivity {
  id: number;
  name: string;
  type: 'Run' | 'Walk' | 'Hike';
  distance: number; // in meters
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  total_elevation_gain: number; // in meters
  start_date: string; // ISO date string
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number;
  elev_low?: number;
  description?: string;
  calories?: number;
  map?: {
    summary_polyline: string;
  };
  // Converted values for easier use
  distanceInMiles?: number;
  durationInMinutes?: number;
  paceInMinutesPerMile?: number;
}

export interface ActivitySummary {
  id: number;
  name: string;
  type: string;
  distance: number; // in miles
  duration: number; // in minutes
  date: string;
  pace?: number; // minutes per mile
  elevation?: number; // in feet
  calories?: number;
  route?: string; // polyline for map display
}

// Goal and Progress Types
export interface Goal {
  id: string;
  userId: string;
  type: 'monthly' | 'seasonal';
  target: number; // in miles
  current: number; // in miles
  startDate: string;
  endDate: string;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MonthlyGoal extends Goal {
  type: 'monthly';
  month: number; // 1-12
  year: number;
}

export interface SeasonalGoal extends Goal {
  type: 'seasonal';
  season: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  year: number;
}

export interface Progress {
  userId: string;
  monthlyMileage: number;
  seasonalMileage: number;
  monthlyGoal: number; // default 26.2
  seasonalGoal: number; // default 78.6
  monthlyProgress: number; // percentage
  seasonalProgress: number; // percentage
  lastUpdated: number;
  totalActivities: number;
  averagePace: number;
  longestRun: number;
}

// Dashboard Types
export interface DashboardData {
  user: User;
  progress: Progress;
  recentActivities: ActivitySummary[];
  monthlyGoal: MonthlyGoal;
  seasonalGoal: SeasonalGoal;
  achievements: Achievement[];
  motivationalText: string;
  brandLogo: string;
  dashboardTitle: string;
}

export interface Achievement {
  id: string;
  userId: string;
  type: 'monthly_goal' | 'seasonal_goal' | 'streak' | 'milestone' | 'first_activity';
  title: string;
  description: string;
  achievedAt: number;
  icon?: string;
  badge?: string;
}

// Admin and Export Types
export interface AdminExportData {
  users: UserExportData[];
  totalUsers: number;
  goalAchievers: number;
  exportDate: string;
  season: string;
  year: number;
}

export interface UserExportData {
  id: string;
  name: string;
  email: string;
  monthlyMileage: number;
  seasonalMileage: number;
  monthlyGoalMet: boolean;
  seasonalGoalMet: boolean;
  lastActivityDate?: string;
  joinDate: string;
  shopifyCustomerId?: string;
  totalActivities: number;
  averagePace: number;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  filters?: {
    goalMet?: boolean;
    season?: string;
    month?: number;
    year?: number;
    activeUsersOnly?: boolean;
  };
  includeFields?: string[];
  shopifyIntegration?: boolean;
}

// Admin Configuration Types
export interface AdminConfig {
  motivationalText: string;
  dashboardTitle: string;
  brandLogo: {
    url: string;
    altText: string;
    width?: number;
    height?: number;
  };
  goals: {
    defaultMonthly: number;
    defaultSeasonal: number;
    customMonthly?: number;
    customSeasonal?: number;
  };
  features: {
    showRecentActivities: boolean;
    showAchievements: boolean;
    showPace: boolean;
    showCalories: boolean;
  };
  shopify: {
    enabled: boolean;
    webhookUrl?: string;
    apiKey?: string;
    shopDomain?: string;
  };
}

// Season and Date Types
export interface Season {
  name: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  startMonth: number;
  endMonth: number;
  startDay: number;
  endDay: number;
  displayName: string;
}

export interface DateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Configuration Types
export interface AppConfig {
  strava: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    webhookVerifyToken?: string;
  };
  goals: {
    defaultMonthly: number; // 26.2 miles
    defaultSeasonal: number; // 78.6 miles
  };
  seasons: Season[];
  features: {
    enableAchievements: boolean;
    enableSocialFeatures: boolean;
    enableExport: boolean;
    enableShopifyIntegration: boolean;
    enableEmailReminders: boolean;
  };
  hosting: {
    platform: 'firebase' | 'vercel' | 'custom';
    domain?: string;
    embedUrl?: string;
  };
  security: {
    rateLimitWindow: number;
    rateLimitMax: number;
    tokenRefreshThreshold: number; // minutes before expiry
  };
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  userId?: string;
  requestId?: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'goal_achieved' | 'goal_reminder' | 'streak' | 'system' | 'welcome';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: number;
  actionUrl?: string;
  emailSent?: boolean;
}

// Email Integration Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
}

export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  recipients: string[];
  scheduledAt?: number;
  sentAt?: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
}

// Analytics Types
export interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalMileage: number;
  averageMonthlyMileage: number;
  goalCompletionRate: number;
  topPerformers: UserExportData[];
  activityBreakdown: {
    run: number;
    walk: number;
    hike: number;
    other: number;
  };
  seasonalStats: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

// Webhook Types
export interface StravaWebhook {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  updates?: {
    title?: string;
    type?: string;
    private?: boolean;
  };
  owner_id: number;
  subscription_id: number;
  event_time: number;
}

// Shopify Integration Types
export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ShopifyTagUpdate {
  customerId: number;
  tags: string[];
  action: 'add' | 'remove' | 'replace';
}

// Cache Types
export interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: number;
  version?: string;
}

// Rate Limiting Types
export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  window: number;
  userId?: string;
  endpoint?: string;
}

// Sync and Background Job Types
export interface SyncJob {
  id: string;
  userId: string;
  type: 'initial' | 'periodic' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  activitiesSynced?: number;
  error?: string;
}

export interface BackgroundJob {
  id: string;
  type: 'sync_activities' | 'update_progress' | 'send_reminders' | 'export_data';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  data?: any;
  error?: string;
}

// Future Integration Types
export interface HealthKitData {
  userId: string;
  activities: ActivitySummary[];
  source: 'apple_health' | 'garmin' | 'fitbit';
  lastSync: number;
}

export interface ThirdPartyIntegration {
  id: string;
  name: string;
  type: 'health' | 'fitness' | 'social';
  enabled: boolean;
  config: Record<string, any>;
  lastSync?: number;
}
  