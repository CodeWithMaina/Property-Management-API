import { Request, Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { users, userAuth } from "../drizzle/schema";
import {
  createSuccessResponse,
  createErrorResponse,
} from "../utils/apiResponse/apiResponse.types";
import { formatZodError } from "../utils/formatZodError";
import { PasswordService } from "./PasswordService";
import { AuthCoreService } from "./auth.service";

const enhancedLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().optional(),
  userAgent: z.string().optional(),
  mfaToken: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const passwordResetSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const createUserSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(255, "Full name too long"),
  email: z.string().email("Invalid email format").max(319, "Email too long"),
  phone: z.string().max(63, "Phone number too long").optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationId: z.string().uuid("Invalid organization ID").optional(), // Changed from organizationName
  role: z
    .enum([
      "tenant",
      "caretaker",
      "manager",
      "propertyOwner",
      "admin",
      "superAdmin",
    ])
    .optional()
    .default("tenant"),
});

export class AuthEnhancedController {
  private authService: AuthCoreService;
  private passwordService: PasswordService;

  constructor() {
    this.authService = new AuthCoreService();
    this.passwordService = new PasswordService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createUserSchema.parse(req.body);

      const result = await this.authService.registerUser(validatedData);

      // Generate tokens for the new user
      const tokens = await this.authService.login({
        email: validatedData.email,
        password: validatedData.password,
        deviceId: "registration",
        userAgent: req.headers["user-agent"],
      });

      const response = createSuccessResponse(
        {
          user: {
            id: result.user.id,
            fullName: result.user.fullName,
            email: result.user.email,
            phone: result.user.phone,
            organizations: result.organization
              ? [
                  {
                    id: result.organization.id,
                    role: "admin", // First user becomes admin
                    permissions: result.organization.permissions,
                    isPrimary: true,
                    organization: {
                      id: result.organization.id,
                      name: result.organization.name,
                      legalName: result.organization.legalName,
                    },
                  },
                ]
              : [],
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
        },
        "User created successfully"
      );

      res.status(201).json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Create user error:", error);

      // Handle specific error cases
      let errorMessage = "Failed to create user";
      let errorCode = "REGISTRATION_ERROR";

      if (error.message.includes("already exists")) {
        errorMessage = error.message;
        errorCode = "USER_ALREADY_EXISTS";
      } else if (error.message.includes("Password validation failed")) {
        errorMessage = error.message;
        errorCode = "PASSWORD_POLICY_ERROR";
      } else if (error.code === "23505") {
        errorMessage = "Organization name already exists";
        errorCode = "ORGANIZATION_EXISTS";
      }

      res.status(400).json(createErrorResponse(errorMessage, errorCode));
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = enhancedLoginSchema.parse(req.body);

      const tokens = await this.authService.login(validatedData);

      // Get user data to include in response
      const user = await db.query.users.findFirst({
        where: eq(users.id, (tokens as any).userId), // The userId should be returned from authService.login
        with: {
          userOrganizations: {
            with: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const response = createSuccessResponse(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType,
          // ✅ ADD USER DATA
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
            organizations:
              user.userOrganizations?.map((org: any) => ({
                id: org.organizationId,
                role: org.role,
                permissions: org.permissions,
                isPrimary: org.isPrimary,
                organization: {
                  id: org.organization?.id,
                  name: org.organization?.name,
                  legalName: org.organization?.legalName,
                },
              })) || [],
          },
        },
        "Login successful"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Login error:", error);

      const statusCode =
        error.message.includes("Invalid credentials") ||
        error.message.includes("Account deactivated")
          ? 401
          : 500;

      res
        .status(statusCode)
        .json(
          createErrorResponse(
            error.message || "Failed to login",
            "AUTHENTICATION_ERROR"
          )
        );
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);

      const tokens = await this.authService.refreshTokens(
        validatedData.refreshToken
      );

      const response = createSuccessResponse(
        {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        "Token refreshed successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Refresh token error:", error);
      res
        .status(401)
        .json(
          createErrorResponse(
            error.message || "Failed to refresh token",
            "TOKEN_ERROR"
          )
        );
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { deviceId } = req.body;

      if (!userId) {
        res
          .status(401)
          .json(
            createErrorResponse(
              "Authentication required",
              "AUTHENTICATION_ERROR"
            )
          );
        return;
      }

      await this.authService.logout(userId, deviceId);

      const response = createSuccessResponse(null, "Logged out successfully");

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Logout error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            error.message || "Failed to logout",
            "LOGOUT_ERROR"
          )
        );
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = verifyEmailSchema.parse(req.body);

      const success = await this.authService.verifyEmail(validatedData.token);

      if (success) {
        const response = createSuccessResponse(
          null,
          "Email verified successfully"
        );
        res.status(200).json(response);
      } else {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Invalid or expired verification token",
              "VERIFICATION_ERROR"
            )
          );
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Email verification error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            error.message || "Failed to verify email",
            "VERIFICATION_ERROR"
          )
        );
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = passwordResetRequestSchema.parse(req.body);

      await this.authService.requestPasswordReset(validatedData.email);

      // Always return success to prevent email enumeration
      const response = createSuccessResponse(
        null,
        "If the email exists, a reset link has been sent"
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Password reset request error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            "Failed to process password reset request",
            "PASSWORD_RESET_ERROR"
          )
        );
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = passwordResetSchema.parse(req.body);

      await this.authService.resetPassword(validatedData);

      const response = createSuccessResponse(
        null,
        "Password has been reset successfully. Please login again."
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Password reset error:", error);

      const statusCode =
        error.message.includes("Invalid reset token") ||
        error.message.includes("Password validation failed")
          ? 400
          : 500;

      res
        .status(statusCode)
        .json(
          createErrorResponse(
            error.message || "Failed to reset password",
            "PASSWORD_RESET_ERROR"
          )
        );
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const userId = (req as any).user?.userId;

      if (!userId) {
        res
          .status(401)
          .json(
            createErrorResponse(
              "Authentication required",
              "AUTHENTICATION_ERROR"
            )
          );
        return;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          userAuth: true,
        },
      });

      if (!user || !user.userAuth || user.userAuth.length === 0) {
        res
          .status(404)
          .json(createErrorResponse("User not found", "USER_NOT_FOUND"));
        return;
      }

      const userAuthRecord = user.userAuth[0];

      const isCurrentPasswordValid =
        await this.passwordService.validatePassword(
          validatedData.currentPassword,
          userAuthRecord.passwordHash
        );

      if (!isCurrentPasswordValid) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Current password is incorrect",
              "PASSWORD_MISMATCH"
            )
          );
        return;
      }

      const passwordValidation = this.passwordService.validatePasswordPolicy(
        validatedData.newPassword
      );
      if (!passwordValidation.isValid) {
        res
          .status(400)
          .json(
            createErrorResponse(
              `Password validation failed: ${passwordValidation.errors.join(
                ", "
              )}`,
              "PASSWORD_POLICY_ERROR"
            )
          );
        return;
      }

      const hashedPassword = await this.passwordService.hashPassword(
        validatedData.newPassword
      );

      await db
        .update(userAuth)
        .set({
          passwordHash: hashedPassword,
        })
        .where(eq(userAuth.userId, userId));

      await this.authService.logout(userId);

      const response = createSuccessResponse(
        null,
        "Password changed successfully. Please login again."
      );

      res.status(200).json(response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json(
            createErrorResponse(
              "Validation failed",
              "VALIDATION_ERROR",
              formatZodError(error)
            )
          );
        return;
      }

      console.error("Change password error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            error.message || "Failed to change password",
            "PASSWORD_CHANGE_ERROR"
          )
        );
    }
  }

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userContext = (req as any).user;

      if (!userContext) {
        res
          .status(401)
          .json(
            createErrorResponse(
              "Authentication required",
              "AUTHENTICATION_ERROR"
            )
          );
        return;
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userContext.userId),
        with: {
          userOrganizations: {
            with: {
              organization: true,
            },
          },
        },
      });

      if (!user) {
        res
          .status(404)
          .json(createErrorResponse("User not found", "USER_NOT_FOUND"));
        return;
      }

      const response = createSuccessResponse(
        {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            isActive: user.isActive,
          },
          organizations:
            user.userOrganizations?.map((org: any) => ({
              id: org.organizationId,
              role: org.role,
              permissions: org.permissions,
              isPrimary: org.isPrimary,
              organization: {
                id: org.organization?.id,
                name: org.organization?.name,
                legalName: org.organization?.legalName,
              },
            })) || [],
        },
        "User data retrieved successfully"
      );

      res.status(200).json(response);
    } catch (error: any) {
      console.error("Get current user error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            error.message || "Failed to get user data",
            "USER_DATA_ERROR"
          )
        );
    }
  }
}
