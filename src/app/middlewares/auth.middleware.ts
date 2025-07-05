import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { User } from '../interface/types';
import db from '../config/firebase';

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    stravaId?: string;
  };
}

// Verify JWT token
const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, config.jwt.accessSecret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
};

// Generate JWT tokens
export const generateTokens = (user: User) => {
  if (!config.jwt.accessSecret || !config.jwt.refreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      stravaId: user.stravaId 
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

// Authentication middleware
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        timestamp: Date.now(),
      });
    }

    // Verify token
    const decoded = await verifyToken(token);
    
    // Get user from database to ensure they still exist and are active
    const userDoc = await db.collection('users').doc(decoded.id).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        timestamp: Date.now(),
      });
    }

    const user = userDoc.data() as User;
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
        timestamp: Date.now(),
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      stravaId: user.stravaId,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        timestamp: Date.now(),
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        timestamp: Date.now(),
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      timestamp: Date.now(),
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without user
    }

    // Verify token
    const decoded = await verifyToken(token);
    
    // Get user from database
    const userDoc = await db.collection('users').doc(decoded.id).get();
    
    if (userDoc.exists) {
      const user = userDoc.data() as User;
      
      if (user.isActive) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          stravaId: user.stravaId,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: Date.now(),
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
        timestamp: Date.now(),
      });
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(['admin']);

// User or admin middleware
export const requireUserOrAdmin = requireRole(['user', 'admin']);

// Refresh token middleware
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        timestamp: Date.now(),
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
    
    // Get user from database
    const userDoc = await db.collection('users').doc(decoded.id).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        timestamp: Date.now(),
      });
    }

    const user = userDoc.data() as User;
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated',
        timestamp: Date.now(),
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    // Update refresh token in database (optional)
    await db.collection('users').doc(user.id).update({
      lastLoginAt: Date.now(),
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      },
      message: 'Tokens refreshed successfully',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired',
        timestamp: Date.now(),
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        timestamp: Date.now(),
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      timestamp: Date.now(),
    });
  }
};

// Logout middleware (optional - for token blacklisting)
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      // Update last logout time
      await db.collection('users').doc(req.user.id).update({
        lastLogoutAt: Date.now(),
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Logout error:', error);
    next(error);
  }
}; 