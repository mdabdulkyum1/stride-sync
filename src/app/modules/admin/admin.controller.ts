import { Request, Response, NextFunction } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminService } from './admin.service';
import { ApiResponse, AdminConfig, AdminExportData, ExportOptions, Analytics } from '../../interface/types';

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const adminService = AdminService.getInstance();

// CREATE - Create admin configuration
const createAdminConfig = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const configData = req.body;
  
  const newConfig = await adminService.createAdminConfig(configData);
  
  const response: ApiResponse<AdminConfig> = {
    success: true,
    data: newConfig,
    message: 'Admin configuration created successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 201,
    message: response.message,
    data: response.data,
  });
});

// READ - Get admin configuration
const getAdminConfig = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const config = await adminService.getAdminConfig();
  
  if (!config) {
    return sendResponse(res, {
      statusCode: 404,
      message: 'Admin configuration not found',
    });
  }

  const response: ApiResponse<AdminConfig> = {
    success: true,
    data: config,
    message: 'Admin configuration retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// UPDATE - Update admin configuration
const updateAdminConfig = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const updates = req.body;
  
  const updatedConfig = await adminService.updateAdminConfig(updates);
  
  const response: ApiResponse<AdminConfig> = {
    success: true,
    data: updatedConfig,
    message: 'Admin configuration updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// Export users data
const exportUsersData = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const { format, filters, includeFields } = req.query;
  
  const options: ExportOptions = {
    format: format as 'csv' | 'json' | 'xlsx' || 'csv',
    filters: filters ? JSON.parse(filters as string) : {},
    includeFields: includeFields ? (includeFields as string).split(',') : [],
  };

  const exportData = await adminService.exportUsersData(options);
  
  const response: ApiResponse<AdminExportData> = {
    success: true,
    data: exportData,
    message: `Exported ${exportData.totalUsers} users`,
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// Generate CSV export
const generateCSVExport = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const { format, filters, includeFields } = req.query;
  
  const options: ExportOptions = {
    format: format as 'csv' | 'json' | 'xlsx' || 'csv',
    filters: filters ? JSON.parse(filters as string) : {},
    includeFields: includeFields ? (includeFields as string).split(',') : [],
  };

  const exportData = await adminService.exportUsersData(options);
  const csv = await adminService.generateCSVExport(exportData, options);
  
  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`);
  
  res.send(csv);
});

// Get analytics
const getAnalytics = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const analytics = await adminService.getAnalytics();
  
  const response: ApiResponse<Analytics> = {
    success: true,
    data: analytics,
    message: 'Analytics retrieved successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
    data: response.data,
  });
});

// Update motivational text
const updateMotivationalText = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const { text } = req.body;
  
  if (!text || typeof text !== 'string') {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Motivational text is required',
    });
  }

  await adminService.updateMotivationalText(text);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'Motivational text updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
  });
});

// Update brand logo
const updateBrandLogo = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const logoData = req.body;
  
  if (!logoData.url || !logoData.altText) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'Logo URL and alt text are required',
    });
  }

  await adminService.updateBrandLogo(logoData);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'Brand logo updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
  });
});

// Update goals
const updateGoals = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const goals = req.body;
  
  if (!goals.defaultMonthly && !goals.defaultSeasonal) {
    return sendResponse(res, {
      statusCode: 400,
      message: 'At least one goal value is required',
    });
  }

  await adminService.updateGoals(goals);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'Goals updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
  });
});

// Update features
const updateFeatures = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return sendResponse(res, {
      statusCode: 403,
      message: 'Access denied. Admin role required.',
    });
  }

  const features = req.body;
  
  await adminService.updateFeatures(features);
  
  const response: ApiResponse<null> = {
    success: true,
    message: 'Features updated successfully',
    timestamp: Date.now(),
  };

  sendResponse(res, {
    statusCode: 200,
    message: response.message,
  });
});

export const adminController = {
  createAdminConfig,
  getAdminConfig,
  updateAdminConfig,
  exportUsersData,
  generateCSVExport,
  getAnalytics,
  updateMotivationalText,
  updateBrandLogo,
  updateGoals,
  updateFeatures,
}; 