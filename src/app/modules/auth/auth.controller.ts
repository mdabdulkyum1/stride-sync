import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./authService";
import { refreshToken } from "../../middlewares/auth.middleware";
import { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import db from "../../config/firebase";

const authService = AuthService.getInstance();

const getCallback = catchAsync(async (req, res, next) => {

  const { code } = req.query;

  if (typeof code === "string") {

    const result = await authService.getTokens(code);
    
    // For API responses, return JSON
    if (req.headers.accept?.includes('application/json')) {
      return sendResponse(res, {
        statusCode: 200,
        message: 'Authentication successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
          },
          tokens: result.tokens,
        },
      });
    }
    
    // For web redirects, redirect to dashboard
    res.redirect("/dashboard");

  } else {

    sendResponse(res, {
      statusCode: 400,
      message: "Authorization code missing",
    });

  }
});


const getCallbackUrl = catchAsync(async (req, res, next) => {
  const authUrl = authService.getAuthUrl();
  res.redirect(authUrl);
});

// Refresh token controller
const refreshTokenController = catchAsync(async (req, res, next) => {
  await refreshToken(req, res, next);
});

// Logout controller
const logoutController = catchAsync(async (req: AuthenticatedRequest, res, next) => {
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
});

export const authController = {
  getCallback,
  getCallbackUrl,
  refreshToken: refreshTokenController,
  logout: logoutController
};
