// auth.controller.ts
import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import {
  createUserService,
  getUserByEmailService,
  updateUserPasswordService,
  setPasswordResetTokenService,
  verifyResetTokenService,
  createRefreshTokenService,
  getRefreshTokenService,
  revokeRefreshTokenService,
  revokeAllUserRefreshTokensService,
  getUserByIdService,
} from "./auth.service";

import { sendNotificationEmail } from "../middleware/googleMailer";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.validator";

import { 
  TAuthResponse, 
  TJwtPayload, 
  TUserSession 
} from "./auth.types";
import { z, ZodError } from "zod";

// Generate JWT token
const generateToken = (payload: TJwtPayload): string => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
  
  return jwt.sign(payload, secret, { expiresIn });
};

// Generate refresh token
const generateRefreshToken = (): string => {
  return uuidv4() + uuidv4(); // Double UUID for length
};

// Register new user
export const register: RequestHandler = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await getUserByEmailService(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Create user
    await createUserService(validatedData);

    // Send welcome email
    try {
      await sendNotificationEmail(
        validatedData.email,
        validatedData.name,
        "Account created successfully",
        "Welcome to our property management system"
      );
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue even if email fails
    }

    res.status(201).json({ message: "User created successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: error.message || "Failed to create user" });
  }
};

// Login user
export const login: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Get user with auth info
    const user = await getUserByEmailService(email);
    if (!user || !user.userAuth || user.userAuth.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: "Account is deactivated" });
    }

    // Compare passwords
    const userAuth = user.userAuth[0];
    const isMatch = bcrypt.compareSync(password, userAuth.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login would be implemented in a separate service

    // Generate tokens
    const tokenPayload: TJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.userOrganizations[0]?.role || "tenant",
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken();

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await createRefreshTokenService({
      userId: user.id,
      token: refreshToken,
      deviceId: req.headers["user-agent"] || undefined,
      userAgent: req.headers["user-agent"] || undefined,
      ipAddress: req.ip || undefined,
      expiresAt,
    });

    // Prepare response
    const authResponse: TAuthResponse = {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.userOrganizations[0]?.role || "tenant",
        phone: user.phone || undefined,
      },
    };

    res.status(200).json(authResponse);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: error.message || "Failed to login" });
  }
};

// Logout user
export const logout: RequestHandler = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TUserSession;

    // Revoke all user refresh tokens
    await revokeAllUserRefreshTokensService(decoded.userId);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to logout" });
  }
};

// Refresh token
export const refreshToken: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const { refreshToken } = validatedData;

    // Get refresh token from database
    const storedToken = await getRefreshTokenService(refreshToken);
    if (!storedToken) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // Get user
    const user = await getUserByIdService(storedToken.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or deactivated" });
    }

    // Generate new tokens
    const tokenPayload: TJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.userOrganizations[0]?.role || "tenant",
    };

    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken();

    // Revoke old refresh token
    await revokeRefreshTokenService(refreshToken);

    // Save new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await createRefreshTokenService({
      userId: user.id,
      token: newRefreshToken,
      deviceId: req.headers["user-agent"] || undefined,
      userAgent: req.headers["user-agent"] || undefined,
      ipAddress: req.ip || undefined,
      expiresAt,
    });

    // Prepare response
    const authResponse: TAuthResponse = {
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.userOrganizations[0]?.role || "tenant",
        phone: user.phone || undefined,
      },
    };

    res.status(200).json(authResponse);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(401).json({ error: error.message || "Failed to refresh token" });
  }
};

// Get current user profile
export const getCurrentUser: RequestHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user; // Attached by auth middleware

    const userData = await getUserByIdService(user.userId);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      user: {
        id: userData.id,
        name: userData.fullName,
        email: userData.email,
        role: userData.userOrganizations[0]?.role || "tenant",
        phone: userData.phone || undefined,
        createdAt: userData.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to get user profile" });
  }
};

// Forgot password
export const forgotPassword: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    const { email } = validatedData;

    const user = await getUserByEmailService(email);
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res.status(200).json({ message: "If the email exists, a reset link has been sent" });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { email, purpose: "password_reset" },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // Set token in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await setPasswordResetTokenService(email, resetToken, expiresAt);

    // Send email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    try {
      await sendNotificationEmail(
        email,
        "Password Reset",
        user.fullName,
        `Please click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.`
      );
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      return res.status(500).json({ error: "Failed to send reset email" });
    }

    res.status(200).json({ message: "If the email exists, a reset link has been sent" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: error.message || "Failed to process password reset" });
  }
};

// Reset password
export const resetPassword: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const { token, password } = validatedData;

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (jwtError) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ error: "Invalid token purpose" });
    }

    // Verify token in database
    const isValid = await verifyResetTokenService(decoded.email as string, token);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Update password
    await updateUserPasswordService(decoded.email as string, password);

    // Send confirmation email
    try {
      const user = await getUserByEmailService(decoded.email as string);
      if (user) {
        await sendNotificationEmail(
          decoded.email as string,
          "Password Reset Successful",
          user.fullName,
          "Your password has been reset successfully. If you didn't request this change, please contact support immediately."
        );
      }
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Continue even if email fails
    }

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: error.message || "Failed to reset password" });
  }
};

// Change password (authenticated)
export const changePassword: RequestHandler = async (req: Request, res: Response) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userSession = (req as any).user as TUserSession;

    // Get user with auth info
    const user = await getUserByIdService(userSession.userId);
    if (!user || !user.userAuth || user.userAuth.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const userAuth = user.userAuth[0];
    const isMatch = bcrypt.compareSync(currentPassword, userAuth.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Update password
    await updateUserPasswordService(userSession.email, newPassword);

    // Revoke all refresh tokens (force re-login on other devices)
    await revokeAllUserRefreshTokensService(userSession.userId);

    // Send confirmation email
    try {
      await sendNotificationEmail(
        userSession.email,
        "Password Changed",
        user.fullName,
        "Your password has been changed successfully. If you didn't make this change, please contact support immediately."
      );
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Continue even if email fails
    }

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Validation failed",
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ error: error.message || "Failed to change password" });
  }
};