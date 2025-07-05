import { Request, Response, NextFunction } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ActivityService } from './activity.service';
import { ApiResponse, ActivitySummary, Progress } from '../../interface/types';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const activityService = ActivityService.getInstance();

// CREATE - Sync activities from Strava
const syncActivities = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const result = await activityService.syncActivities(userId);
  
  const response: ApiResponse<{ synced: number; total: number }> = {
    success: true,
    data: result,
    message: `Successfully synced ${result.synced} new activities from ${result.total} total activities`,
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// READ - Get user activities
const getUserActivities = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const { limit, offset, type, startDate, endDate } = req.query;
  
  const options = {
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0,
    type: type as string,
    startDate: startDate as string,
    endDate: endDate as string,
  };

  const activities = await activityService.getUserActivities(userId, options);
  
  const response: ApiResponse<ActivitySummary[]> = {
    success: true,
    data: activities,
    message: `Found ${activities.length} activities`,
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// READ - Get single activity
const getActivity = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  const activityId = parseInt(req.params.activityId);
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  if (!activityId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Activity ID is required',
    });
  }

  const activity = await activityService.getActivity(userId, activityId);
  
  if (!activity) {
    return sendResponse(res, {
      statusCode: 404,
      message: 'Activity not found',
    });
  }

  const response: ApiResponse<ActivitySummary> = {
    success: true,
    data: activity,
    message: 'Activity retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// UPDATE - Update activity
const updateActivity = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  const activityId = parseInt(req.params.activityId);
  const updates = req.body;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  if (!activityId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Activity ID is required',
    });
  }

  // Validate updates
  const allowedFields = ['name', 'type', 'distance', 'duration', 'pace', 'elevation', 'calories'];
  const validUpdates: Partial<ActivitySummary> = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      validUpdates[field as keyof ActivitySummary] = updates[field];
    }
  }

  const updatedActivity = await activityService.updateActivity(userId, activityId, validUpdates);
  
  const response: ApiResponse<ActivitySummary> = {
    success: true,
    data: updatedActivity,
    message: 'Activity updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// DELETE - Delete activity
const deleteActivity = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  const activityId = parseInt(req.params.activityId);
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  if (!activityId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Activity ID is required',
    });
  }

  await activityService.deleteActivity(userId, activityId);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'Activity deleted successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
  });
});

// READ - Get user progress
const getUserProgress = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const progress = await activityService.getUserProgress(userId);
  
  if (!progress) {
    return sendResponse(res, {
      statusCode: 404,
      message: 'Progress not found',
    });
  }

  const response: ApiResponse<Progress> = {
    success: true,
    data: progress,
    message: 'Progress retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// UPDATE - Update user progress (manual trigger)
const updateUserProgress = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id || req.params.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const progress = await activityService.updateUserProgress(userId);
  
  const response: ApiResponse<Progress> = {
    success: true,
    data: progress,
    message: 'Progress updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

export const activityController = {
  syncActivities,
  getUserActivities,
  getActivity,
  updateActivity,
  deleteActivity,
  getUserProgress,
  updateUserProgress,
}; 