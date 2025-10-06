// auth.service.ts
import { eq, and } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  users, userAuth, refreshTokens, organizations, 
  userOrganizations
} from "../drizzle/schema";
import bcrypt from "bcrypt";
import { TUserWithAuth, TUserAuth } from "./auth.types";

/**
 * 🆕 Create a new user with organization
 */
export const createUserServices = async (userData: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  organizationName?: string;
}): Promise<{ user: any; organization: any }> => {
  return await db.transaction(async (tx) => {
    // Create user
    const [user] = await tx.insert(users)
      .values({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
      })
      .returning();

    // Hash password and create auth record
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);
    
    await tx.insert(userAuth)
      .values({
        userId: user.id,
        email: userData.email,
        passwordHash: hashedPassword,
      });

    // Create organization if provided
    let organization;
    if (userData.organizationName) {
      [organization] = await tx.insert(organizations)
        .values({
          name: userData.organizationName,
          legalName: userData.organizationName,
        })
        .returning();

      // Link user to organization as admin
      await tx.insert(userOrganizations)
        .values({
          userId: user.id,
          organizationId: organization.id,
          role: "admin",
          isPrimary: true,
          permissions: {
            canManageProperties: true,
            canCreateProperties: true,
            canDeleteProperties: true,
            canManageUsers: true,
            canInviteUsers: true,
            canRemoveUsers: true,
            canChangeUserRoles: true,
            canManageOrganizationSettings: true,
          }
        });
    }

    return { user, organization };
  });
};

/**
 * 🎯 Type guard to validate user with auth data
 */
export const isUserWithAuth = (user: any): user is TUserWithAuth => {
  return user && typeof user === 'object' && 'id' in user && 'email' in user;
};

/**
 * 🎯 Helper function to transform database result to TUserWithAuth
 */
const transformUserWithAuth = (dbUser: any): TUserWithAuth | undefined => {
  if (!dbUser) return undefined;

  return {
    ...dbUser,
    userAuth: dbUser.userAuth?.[0] as TUserAuth | undefined,
    userOrganizations: dbUser.userOrganizations || []
  };
};

/**
 * 📧 Get user by email with auth and organization data
 */
export const getUserByEmailService = async (
  email: string
): Promise<TUserWithAuth | undefined> => {
  const result = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      userAuth: true,
      userOrganizations: {
        with: {
          organization: true
        }
      }
    }
  });
  
  return transformUserWithAuth(result);
};

/**
 * 🔍 Get user by ID with auth and organization data
 */
export const getUserByIdService = async (
  id: string
): Promise<TUserWithAuth | undefined> => {
  const result = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      userAuth: true,
      userOrganizations: {
        with: {
          organization: true
        }
      }
    }
  });
  
  return transformUserWithAuth(result);
};

/**
 * 🔑 Update user password
 */
export const updateUserPasswordService = async (
  email: string, 
  newPassword: string
): Promise<void> => {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  await db.update(userAuth)
    .set({ 
      passwordHash: hashedPassword,
      resetToken: null,
      resetTokenExpiresAt: null 
    })
    .where(eq(userAuth.email, email));
};

/**
 * 💾 Store refresh token
 */
export const storeRefreshTokenService = async (
  userId: string,
  token: string,
  deviceId?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

  await db.insert(refreshTokens)
    .values({
      userId,
      token,
      deviceId,
      userAgent,
      ipAddress,
      expiresAt,
    });
};

/**
 * ✅ Verify refresh token
 */
export const verifyRefreshTokenService = async (
  token: string,
  deviceId?: string
): Promise<{ isValid: boolean; userId?: string }> => {
  const refreshToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, token),
      eq(refreshTokens.isRevoked, false)
    ),
    with: {
      user: true
    }
  });

  if (!refreshToken) {
    return { isValid: false };
  }

  // Check expiration
  if (new Date() > refreshToken.expiresAt) {
    return { isValid: false };
  }

  // Optional device binding
  if (deviceId && refreshToken.deviceId !== deviceId) {
    return { isValid: false };
  }

  return { 
    isValid: true, 
    userId: refreshToken.userId 
  };
};

/**
 * 🚫 Revoke refresh token
 */
export const revokeRefreshTokenService = async (token: string): Promise<void> => {
  await db.update(refreshTokens)
    .set({ 
      isRevoked: true,
      revokedAt: new Date()
    })
    .where(eq(refreshTokens.token, token));
};

/**
 * 🚫 Revoke all user refresh tokens
 */
export const revokeAllUserRefreshTokensService = async (userId: string): Promise<void> => {
  await db.update(refreshTokens)
    .set({ 
      isRevoked: true,
      revokedAt: new Date()
    })
    .where(eq(refreshTokens.userId, userId));
};