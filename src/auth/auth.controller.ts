// auth.controller.ts
import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  createUserServices,
  getUserByEmailService,
  updateUserPasswordService,
  storeRefreshTokenService,
  revokeRefreshTokenService,
  revokeAllUserRefreshTokensService,
} from "./auth.service";
import { sendNotificationEmail } from "../middleware/googleMailer";
import { createUserSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema, refreshTokenSchema } from "./auth.schema";
import { TUserWithAuth } from "./auth.types";
import { formatZodError } from "../utils/formatZodError";

/**
 * 🎯 Helper function to verify password with proper typing
 */
const verifyPassword = (password: string, user: TUserWithAuth): boolean => {
  if (!user.userAuth?.passwordHash) {
    return false;
  }
  return bcrypt.compareSync(password, user.userAuth.passwordHash);
};

/**
 * 🆕 User Registration
 */
export const createUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate input
    const validatedData = createUserSchema.parse(req.body);
    const userEmail = validatedData.email;

    // Check for existing user
    const existingUser = await getUserByEmailService(userEmail);
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Create user and organization
    const { user, organization } = await createUserServices(validatedData);

    // Send welcome email
    const emailResult = await sendNotificationEmail(
      validatedData.email,
      validatedData.fullName,
      "Account created successfully",
      "Welcome to our property management system!</b>"
    );

    if (!emailResult) {
      console.error("Failed to send notification email");
    }

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
          }
        : null,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: formatZodError(error)
      });
    }
    console.error("Create user error:", error);
    res.status(500).json({ error: error.message || "Failed to create user" });
  }
};

/**
 * 🔑 User Login
 */
export const loginUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password, deviceId, userAgent } = validatedData;

    // Get user with auth data
    const user = await getUserByEmailService(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: "Account deactivated" });
    }

    if (!user.userAuth) {
      return res.status(401).json({ error: "Authentication data not found" });
    }

    // Verify password using helper function
    const isPasswordValid = verifyPassword(password, user);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check email verification
    // if (!user.userAuth.isEmailVerified) {
    //   return res.status(403).json({
    //     error: "Email verification required",
    //     requiresVerification: true,
    //   });
    // }

    // Get user's organizations and permissions
    const userOrgs = user.userOrganizations || [];
    const primaryOrg = userOrgs.find((org) => org.isPrimary);

    // Generate access token
    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      orgId: primaryOrg?.organizationId,
      roles: userOrgs.map((org) => org.role),
      permissions: primaryOrg?.permissions || {},
      deviceId,
    };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" } // Short-lived access token
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, deviceId },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "30d" }
    );

    // Store refresh token
    await storeRefreshTokenService(
      user.id,
      refreshToken,
      deviceId,
      userAgent,
      req.ip
    );

    // Update last login
    // This would be implemented in your service layer

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        organizations: userOrgs.map((org) => ({
          id: org.organizationId,
          role: org.role,
          isPrimary: org.isPrimary,
          permissions: org.permissions,
        })),
      },
      expiresIn: 15 * 60, // 15 minutes in seconds
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: formatZodError(error)
      });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: error.message || "Failed to login" });
  }
};

/**
 * 🔄 Refresh Access Token
 */
export const refreshToken: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const { refreshToken, deviceId } = validatedData;

    // Verify refresh token (middleware already validated it)
    if (!req.user) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = req.user;

    // Generate new access token
    const userOrgs = user.userOrganizations || [];
    const primaryOrg = userOrgs.find((org) => org.isPrimary);

    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      orgId: primaryOrg?.organizationId,
      roles: userOrgs.map((org) => org.role),
      permissions: primaryOrg?.permissions || {},
      deviceId,
    };

    const newAccessToken = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    // Optionally rotate refresh token for security
    const newRefreshToken = jwt.sign(
      { userId: user.id, deviceId },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "30d" }
    );

    // Store new refresh token and revoke old one
    await storeRefreshTokenService(
      user.id,
      newRefreshToken,
      deviceId,
      req.get("User-Agent"),
      req.ip
    );
    await revokeRefreshTokenService(refreshToken);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: formatZodError(error)
      });
    }
    console.error("Refresh token error:", error);
    res.status(500).json({ error: error.message || "Failed to refresh token" });
  }
};

/**
 * 🔐 Password Reset Request
 */
export const passwordReset: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = passwordResetRequestSchema.parse(req.body);
    const { email } = validatedData;

    const user = await getUserByEmailService(email);
    if (!user) {
      // Don't reveal whether user exists
      return res.status(200).json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    if (!user.userAuth) {
      return res.status(400).json({ error: "Authentication data not found" });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: "password_reset" },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Store reset token in database
    // This would be implemented in your service layer

    const resetLink = `http://localhost:5000/api/auth/reset-password/${resetToken}`;

    const emailResult = await sendNotificationEmail(
      email,
      "Password Reset Request",
      user.fullName,
      `Click the link to reset your password: <a href="${resetLink}">Reset Password</a><br><br>
       This link will expire in 1 hour.`
    );

    if (!emailResult) {
      console.error("Failed to send reset email");
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    console.log("Password reset email sent successfully to:", email);
    res.status(200).json({
      message: "If the email exists, a reset link has been sent",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: formatZodError(error)
      });
    }
    console.error("Password reset error:", error);
    res.status(500).json({
      error: error.message || "Failed to process password reset request",
    });
  }
};

/**
 * 🔑 Update Password
 */
export const updatePassword: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = passwordResetSchema.parse(req.body);
    const { token, password } = validatedData;

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Verify reset token
    const payload: any = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "password_reset") {
      return res.status(400).json({ error: "Invalid token type" });
    }

    // Update password
    await updateUserPasswordService(payload.email, password);

    // Send confirmation email
    await sendNotificationEmail(
      payload.email,
      "Password Reset Successful",
      payload.email, // Name would be fetched from user data
      "Your password has been reset successfully."
    );

    // Revoke all existing refresh tokens for security
    await revokeAllUserRefreshTokensService(payload.userId);

    res.status(200).json({
      message: "Password has been reset successfully. Please login again.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: formatZodError(error)
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    console.error("Update password error:", error);
    res.status(500).json({
      error: error.message || "Failed to reset password",
    });
  }
};

/**
 * 🚪 Logout
 */
export const logout: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshTokenService(refreshToken);
    }

    // If no specific token provided, revoke all for the user
    if (req.user && !refreshToken) {
      await revokeAllUserRefreshTokensService(req.user.id);
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message || "Failed to logout" });
  }
};