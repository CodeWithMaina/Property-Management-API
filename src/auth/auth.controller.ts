// auth.controller.ts
import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { z, ZodError } from "zod";

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

import { TAuthResponse, TJwtPayload, TUserSession } from "./auth.types";

// Helper function to format Zod errors safely
const formatZodError = (error: ZodError) => {
  return {
    error: "Validation failed",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
};

// Generate JWT token with proper typing
const generateToken = (payload: TJwtPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || "1h";
  
  return jwt.sign(payload, secret, { expiresIn });
};

// Generate password reset token
const generateResetToken = (email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.sign(
    { email, purpose: "password_reset" },
    secret,
    { expiresIn: "1h" }
  );
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
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json(formatZodError(error));
    }
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to create user" });
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

    // Generate tokens with proper structure
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json(formatZodError(error));
    }
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to login" });
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
    
    // Verify token to get user ID
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (jwtError) {
      // If token is invalid/expired, still return success for logout
      console.warn("JWT verification failed during logout:", jwtError);
      return res.status(200).json({ message: "Logged out successfully" });
    }

    // Revoke all user refresh tokens if we have a valid user ID
    if (decoded && decoded.userId) {
      await revokeAllUserRefreshTokensService(decoded.userId);
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error: unknown) {
    console.error("Logout error:", error);
    // Even if there's an error, return success for logout
    res.status(200).json({ message: "Logged out successfully" });
  }
};

// Get current user profile - Fixed version
export const getCurrentUser: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userSession = (req as any).user; // This should be set by auth middleware

    if (!userSession || !userSession.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Use the data already loaded by the auth middleware
    res.status(200).json({
      user: {
        id: userSession.user.id,
        name: userSession.user.fullName,
        email: userSession.user.email,
        role: userSession.role,
        phone: userSession.user.phone || undefined,
        createdAt: userSession.user.createdAt,
        organizations: userSession.organizations,
        managedProperties: userSession.managedProperties,
      },
    });
  } catch (error: unknown) {
    console.error("Get current user error:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to get user profile" });
  }
}

// Refresh token
export const refreshToken: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const { refreshToken } = validatedData;

    // Get refresh token from database
    const storedToken = await getRefreshTokenService(refreshToken);
    if (!storedToken) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json(formatZodError(error));
    }
    
    if (error instanceof Error) {
      return res.status(401).json({ error: error.message });
    }
    
    res.status(401).json({ error: "Failed to refresh token" });
  }
};

// Forgot password
export const forgotPassword: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    const { email } = validatedData;

    const user = await getUserByEmailService(email);
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return res
        .status(200)
        .json({ message: "If the email exists, a reset link has been sent" });
    }

    // Generate reset token
    const resetToken = generateResetToken(email);

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

    res
      .status(200)
      .json({ message: "If the email exists, a reset link has been sent" });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json(formatZodError(error));
    }
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to process password reset" });
  }
};

// Reset password
export const resetPassword: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const { token, password } = validatedData;

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (jwtError) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ error: "Invalid token purpose" });
    }

    const email = decoded.email as string;
    if (!email) {
      return res.status(400).json({ error: "Invalid token" });
    }

    // Verify token in database
    const isValid = await verifyResetTokenService(email, token);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Update password
    await updateUserPasswordService(email, password);

    // Send confirmation email
    try {
      const user = await getUserByEmailService(email);
      if (user) {
        await sendNotificationEmail(
          email,
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json(formatZodError(error));
    }
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to reset password" });
  }
};

// Change password (authenticated)
export const changePassword: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userSession = (req as any).user as TUserSession;

    if (!userSession || !userSession.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json(formatZodError(error));
    }
    
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.status(500).json({ error: "Failed to change password" });
  }
};