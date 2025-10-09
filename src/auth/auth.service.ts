// services/auth/AuthCoreService.ts
import jwt from "jsonwebtoken";
import { and, eq, gt } from "drizzle-orm";
import db from "../drizzle/db";
import {
  users,
  userAuth,
  organizations,
  userOrganizations,
  UserRole,
} from "../drizzle/schema";
import { AuditLogger } from "../utils/auditLogger";
import { PasswordService } from "./PasswordService";
import { TokenService } from "./TokenService";
import {
  RegistrationData,
  LoginCredentials,
  AuthTokens,
  TokenPayload,
  RefreshTokenPayload,
  PasswordResetData,
  UserContext,
} from "./auth.types";

export class AuthCoreService {
  private passwordService: PasswordService;
  private tokenService: TokenService;
  private auditLogger: AuditLogger;

  constructor() {
    this.passwordService = new PasswordService();
    this.tokenService = new TokenService();
    this.auditLogger = new AuditLogger();
  }

  async registerUser(
    registrationData: RegistrationData
  ): Promise<{ user: any; organization?: any }> {
    try {
      // Validate password policy
      const passwordValidation = this.passwordService.validatePasswordPolicy(
        registrationData.password
      );
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Check for existing user
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, registrationData.email),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create user and attach to organization in transaction
      return await db.transaction(async (tx) => {
        // Create user
        const [user] = await tx
          .insert(users)
          .values({
            fullName: registrationData.fullName,
            email: registrationData.email,
            phone: registrationData.phone,
          })
          .returning();

        // Hash password and create auth record
        const hashedPassword = await this.passwordService.hashPassword(
          registrationData.password
        );

        await tx.insert(userAuth).values({
          userId: user.id,
          email: registrationData.email,
          passwordHash: hashedPassword,
          isEmailVerified: false,
        });

        let organization;

        // Handle organization creation/attachment
        if (registrationData.organizationId) {
          // Attach to existing organization
          const existingOrg = await tx.query.organizations.findFirst({
            where: eq(organizations.id, registrationData.organizationId),
          });

          if (!existingOrg) {
            throw new Error("Organization not found");
          }

          organization = existingOrg;

          // Link user to organization with specified role
          await tx.insert(userOrganizations).values({
            userId: user.id,
            organizationId: registrationData.organizationId,
            role: registrationData.role || "tenant",
            isPrimary: true,
            permissions: this.getDefaultPermissionsForRole(
              registrationData.role || "tenant"
            ),
          });
        } else if (registrationData.organizationName) {
          // Create new organization
          const [newOrg] = await tx
            .insert(organizations)
            .values({
              name: registrationData.organizationName,
              legalName: registrationData.organizationName,
            })
            .returning();

          organization = newOrg;

          // Link user as admin of the new organization
          await tx.insert(userOrganizations).values({
            userId: user.id,
            organizationId: newOrg.id,
            role: "admin", // First user becomes admin
            isPrimary: true,
            permissions: this.getDefaultPermissionsForRole("admin"),
          });
        }

        // Log registration
        await this.auditLogger.logAuthEvent({
          userId: user.id,
          action: "create",
          ipAddress: "system",
          userAgent: "system",
          timestamp: new Date(),
          metadata: {
            organizationAttached: !!organization,
            organizationId: organization?.id,
            role: registrationData.role,
          },
        });

        return { user, organization };
      });
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  // Helper method to get default permissions based on role
  private getDefaultPermissionsForRole(
    role: UserRole
  ): Record<string, boolean | number> {
    // Allow numbers
    const basePermissions: Record<string, boolean | number> = {};

    switch (role) {
      case "admin":
        basePermissions.canManageProperties = true;
        basePermissions.canCreateProperties = true;
        basePermissions.canDeleteProperties = true;
        basePermissions.canManageUsers = true;
        basePermissions.canInviteUsers = true;
        basePermissions.canRemoveUsers = true;
        basePermissions.canChangeUserRoles = true;
        basePermissions.canManageOrganizationSettings = true;
        basePermissions.maxProperties = 0; // 0 means unlimited
        break;

      case "manager":
        basePermissions.canManageProperties = true;
        basePermissions.canCreateProperties = true;
        basePermissions.canManageUnits = true;
        basePermissions.canManageLeases = true;
        basePermissions.canManageTenants = true;
        basePermissions.canManageMaintenance = true;
        basePermissions.canViewFinancialReports = true;
        basePermissions.maxProperties = 10; // Example limit
        break;

      case "caretaker":
        basePermissions.canManageMaintenance = true;
        basePermissions.canCreateMaintenance = true;
        basePermissions.canAssignMaintenance = true;
        break;

      case "tenant":
        basePermissions.canViewFinancials = true;
        basePermissions.canCreateMaintenance = true;
        break;

      case "propertyOwner":
        basePermissions.canViewFinancialReports = true;
        basePermissions.canManageProperties = true;
        basePermissions.maxProperties = 5; // Example limit
        break;

      default:
        // No additional permissions for other roles
        break;
    }

    return basePermissions;
  }

  // Update the login method to handle proper permission types
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      // Get user with auth data
      const user = await db.query.users.findFirst({
        where: eq(users.email, credentials.email),
        with: {
          userAuth: true,
          userOrganizations: {
            with: {
              organization: true,
            },
          },
        },
      });

      if (!user || !user.userAuth || user.userAuth.length === 0) {
        throw new Error("Invalid credentials");
      }

      // Access the first userAuth record
      const userAuthRecord = user.userAuth[0];

      if (!user.isActive) {
        throw new Error("Account deactivated");
      }

      // Verify password
      const isPasswordValid = await this.passwordService.validatePassword(
        credentials.password,
        userAuthRecord.passwordHash
      );

      if (!isPasswordValid) {
        throw new Error("Invalid credentials");
      }

      // Update last login
      await db
        .update(userAuth)
        .set({ lastLoginAt: new Date() })
        .where(eq(userAuth.userId, user.id));

      // Generate tokens
      const userOrgs = user.userOrganizations || [];
      const primaryOrg = userOrgs.find((org) => org.isPrimary);

      const accessTokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        orgId: primaryOrg?.organizationId,
        roles: userOrgs.map((org) => org.role),
        permissions: primaryOrg?.permissions || {}, // This now accepts numbers
        deviceId: credentials.deviceId,
      };

      const refreshTokenPayload: RefreshTokenPayload = {
        userId: user.id,
        deviceId: credentials.deviceId,
      };

      const accessToken =
        this.tokenService.generateAccessToken(accessTokenPayload);
      const refreshToken =
        this.tokenService.generateRefreshToken(refreshTokenPayload);

      // Store refresh token
      await this.tokenService.storeRefreshToken(
        user.id,
        refreshToken,
        credentials.deviceId,
        credentials.userAgent,
        "system"
      );

      // Log successful login
      await this.auditLogger.logAuthEvent({
        userId: user.id,
        action: "login",
        ipAddress: "system",
        userAgent: credentials.userAgent || "unknown",
        timestamp: new Date(),
        metadata: { deviceId: credentials.deviceId },
      });

      return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60,
      tokenType: "Bearer",
      userId: user.id, // ✅ Add userId to return
    };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const { isValid, userId } =
        await this.tokenService.verifyStoredRefreshToken(refreshToken);

      if (!isValid || !userId) {
        throw new Error("Invalid or expired refresh token");
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          userOrganizations: {
            with: {
              organization: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new Error("User not found or inactive");
      }

      const userOrgs = user.userOrganizations || [];
      const primaryOrg = userOrgs.find((org) => org.isPrimary);

      const accessTokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        orgId: primaryOrg?.organizationId,
        roles: userOrgs.map((org) => org.role),
        permissions: primaryOrg?.permissions || {},
      };

      const newAccessToken =
        this.tokenService.generateAccessToken(accessTokenPayload);

      // Generate new refresh token for rotation
      const newRefreshToken = this.tokenService.generateRefreshToken({
        userId: user.id,
      });

      // Store new refresh token and revoke old one
      await this.tokenService.storeRefreshToken(user.id, newRefreshToken);

      await this.tokenService.revokeToken(refreshToken);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60,
        tokenType: "Bearer",
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      throw error;
    }
  }

  async logout(userId: string, deviceId?: string): Promise<void> {
    try {
      if (deviceId) {
        await this.tokenService.revokeDeviceTokens(userId, deviceId);
      } else {
        await this.tokenService.revokeAllUserTokens(userId);
      }

      await this.auditLogger.logAuthEvent({
        userId,
        action: "logout",
        ipAddress: "system",
        userAgent: "system",
        timestamp: new Date(),
        metadata: { deviceId },
      });
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as any;

      if (payload.type !== "email_verification") {
        throw new Error("Invalid verification token");
      }

      await db
        .update(userAuth)
        .set({
          isEmailVerified: true,
          verificationToken: null,
        })
        .where(eq(userAuth.userId, payload.userId));

      return true;
    } catch (error) {
      console.error("Email verification error:", error);
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
        with: {
          userAuth: true,
        },
      });

      if (!user || !user.userAuth || user.userAuth.length === 0) {
        // Don't reveal if user exists or not for security
        return;
      }

      // Generate a secure reset token (UUID-based approach)
      const resetTokenId = crypto.randomUUID();

      // Create JWT that references the UUID
      const resetToken = jwt.sign(
        {
          tokenId: resetTokenId,
          userId: user.id,
          email: user.email,
          type: "password_reset",
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "1h" }
      );

      await db
        .update(userAuth)
        .set({
          resetToken: resetTokenId, // Store only the UUID in database
          resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(userAuth.userId, user.id));

      console.log(`Password reset token for ${email}: ${resetToken}`);

      // In production, send email with the resetToken (JWT)
      // await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error("Password reset request error:", error);
      throw error;
    }
  }

  async resetPassword(resetData: PasswordResetData): Promise<void> {
    try {
      // Verify the JWT token
      const payload = jwt.verify(
        resetData.token,
        process.env.JWT_SECRET as string
      ) as any;

      if (payload.type !== "password_reset") {
        throw new Error("Invalid reset token");
      }

      // Verify the token ID exists in database and is not expired
      const userAuthRecord = await db.query.userAuth.findFirst({
        where: and(
          eq(userAuth.resetToken, payload.tokenId),
          eq(userAuth.userId, payload.userId),
          gt(userAuth.resetTokenExpiresAt, new Date())
        ),
      });

      if (!userAuthRecord) {
        throw new Error("Invalid or expired reset token");
      }

      const passwordValidation = this.passwordService.validatePasswordPolicy(
        resetData.password
      );
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      const hashedPassword = await this.passwordService.hashPassword(
        resetData.password
      );

      await db
        .update(userAuth)
        .set({
          passwordHash: hashedPassword,
          resetToken: null,
          resetTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(userAuth.userId, payload.userId));

      await this.tokenService.revokeAllUserTokens(payload.userId);

      await this.auditLogger.logAuthEvent({
        userId: payload.userId,
        action: "password_change",
        ipAddress: "system",
        userAgent: "system",
        timestamp: new Date(),
        metadata: { viaReset: true },
      });
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  }

  async validateAccess(
    resourceType: string,
    resourceId: string,
    userContext: UserContext
  ): Promise<boolean> {
    // Implement proper access control logic based on user roles and permissions
    if (userContext.roles.includes("superAdmin")) {
      return true;
    }

    // Add more specific access control logic here
    return false;
  }
}
