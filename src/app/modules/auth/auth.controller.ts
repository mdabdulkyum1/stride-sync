import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AuthService } from "./authService";

const authService = AuthService.getInstance();

const getCallback = catchAsync(async (req, res, next) => {

  const { code } = req.query;

  if (typeof code === "string") {

    await authService.getTokens(code);
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

export const authController = {
  getCallback,
  getCallbackUrl
};
