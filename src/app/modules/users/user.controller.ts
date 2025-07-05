import { Request, Response, NextFunction } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';
import { ApiResponse, User, DashboardData } from '../../interface/types';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const userService = UserService.getInstance();

// CREATE - Create new user (REMOVED - Only Strava OAuth login allowed)
// Users are created automatically when they authenticate with Strava

// READ - Get user by ID
const getUserById = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.user?.id;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const user = await userService.getUserById(userId);
  
  if (!user) {
    return sendResponse(res, {
      statusCode: 404,
      message: 'User not found',
    });
  }

  const response: ApiResponse<User> = {
    success: true,
    data: user,
    message: 'User retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// READ - Get user by email
const getUserByEmail = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { email } = req.query;
  
  if (!email || typeof email !== 'string') {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Email is required',
    });
  }

  const user = await userService.getUserByEmail(email);
  
  if (!user) {
    return sendResponse(res, {
      statusCode: 404,
      message: 'User not found',
    });
  }

  const response: ApiResponse<User> = {
    success: true,
    data: user,
    message: 'User retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// READ - Get all users (admin only)
const getAllUsers = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { limit, offset, role, isActive } = req.query;
  
  const options = {
    limit: limit ? parseInt(limit as string) : 50,
    offset: offset ? parseInt(offset as string) : 0,
    role: role as string,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
  };

  const users = await userService.getAllUsers(options);
  
  const response: ApiResponse<User[]> = {
    success: true,
    data: users,
    message: `Found ${users.length} users`,
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// UPDATE - Update user
const updateUser = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.user?.id;
  const updates = req.body;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  // Validate updates
  const allowedFields = ['name', 'email', 'role', 'profilePicture', 'shopifyCustomerId', 'isActive'];
  const validUpdates: Partial<User> = {};
  
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      validUpdates[field as keyof User] = updates[field];
    }
  }

  const updatedUser = await userService.updateUser(userId, validUpdates);
  
  const response: ApiResponse<User> = {
    success: true,
    data: updatedUser,
    message: 'User updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// DELETE - Delete user (soft delete)
const deleteUser = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.params.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  await userService.deleteUser(userId);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'User deleted successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
  });
});

// HARD DELETE - Permanently delete user (admin only)
const hardDeleteUser = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.params.userId;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  await userService.hardDeleteUser(userId);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'User permanently deleted successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
  });
});

// READ - Get user dashboard
const getUserDashboard = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.user?.id;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  const dashboard = await userService.getUserDashboard(userId);
  
  if (!dashboard) {
    return sendResponse(res, {
      statusCode: 404,
      message: 'Dashboard not found',
    });
  }

  const response: ApiResponse<DashboardData> = {
    success: true,
    data: dashboard,
    message: 'Dashboard retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// UPDATE - Update user last login
const updateLastLogin = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  
  if (!userId) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'User ID is required',
    });
  }

  await userService.updateLastLogin(userId);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'Last login updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
  });
});

// READ - Get user count (admin only)
const getUserCount = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const count = await userService.getUserCount();
  
  const response: ApiResponse<{ count: number }> = {
    success: true,
    data: { count },
    message: 'User count retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// READ - Search users (admin only)
const searchUsers = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { q: searchTerm, limit, offset } = req.query;
  
  if (!searchTerm || typeof searchTerm !== 'string') {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Search term is required',
    });
  }

  const options = {
    limit: limit ? parseInt(limit as string) : 20,
    offset: offset ? parseInt(offset as string) : 0,
  };

  const users = await userService.searchUsers(searchTerm, options);
  
  const response: ApiResponse<User[]> = {
    success: true,
    data: users,
    message: `Found ${users.length} users matching "${searchTerm}"`,
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message as string,
    data: response.data,
  });
});

// Get current user's profile
const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: 401,
        message: 'User not authenticated',
      });
    }

    const user = await userService.getUserById(req.user.id);
    
    if (!user) {
      return sendResponse(res, {
        statusCode: 404,
        message: 'User not found',
      });
    }

          return sendResponse(res, {
        statusCode: 200,
        message: 'User profile retrieved successfully',
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          stravaId: user.stravaId,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
      });
  } catch (error) {
    console.error('Error getting user profile:', error);
          return sendResponse(res, {
        statusCode: 500,
        message: 'Failed to get user profile',
      });
  }
};

// Get current user's dashboard data
const getUserDashboardData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendResponse(res, {
        statusCode: 401,
        message: 'User not authenticated',
      });
    }

    const dashboardData = await userService.getUserDashboard(req.user.id);
    
    return sendResponse(res, {
      statusCode: 200,
      message: 'Dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error getting user dashboard:', error);
    return sendResponse(res, {
      statusCode: 500,
      message: 'Failed to get dashboard data',
    });
  }
};

export const userController = {
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser,
  hardDeleteUser,
  getUserDashboard,
  updateLastLogin,
  getUserCount,
  searchUsers,
  getUserProfile,
  getUserDashboardData,
}; 