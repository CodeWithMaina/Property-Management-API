// auth.service.ts
import { eq, and, gt } from "drizzle-orm";
import db from "../drizzle/db";
import { users, userAuth, refreshTokens } from "../drizzle/schema";
import { 
  TCreateUserData, 
  TCreateRefreshTokenData 
} from "./auth.types";
import bcrypt from "bcrypt";

// Create a new user with authentication
export const createUserService = async (userData: TCreateUserData): Promise<string> => {
  const { password, ...userInfo } = userData;
  
  // Create user first
  const [newUser] = await db.insert(users)
    .values({
      fullName: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone || null,
    })
    .returning();

  // Hash password
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  // Create user auth record
  await db.insert(userAuth)
    .values({
      userId: newUser.id,
      email: userInfo.email,
      passwordHash: hashedPassword,
    });

  return "User created successfully";
};

// Get user by email
export const getUserByEmailService = async (email: string) => {
  return await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      userAuth: true,
      userOrganizations: {
        with: {
          organization: true,
        },
      },
    },
  });
};

// Get user by ID
export const getUserByIdService = async (id: string) => {
  return await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      userAuth: true,
      userOrganizations: {
        with: {
          organization: true,
        },
      },
    },
  });
};

// Update user password
export const updateUserPasswordService = async (
  email: string, 
  newPassword: string
): Promise<string> => {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(newPassword, salt);

  const result = await db.update(userAuth)
    .set({ 
      passwordHash: hashedPassword,
      resetToken: null,
      resetTokenExpiresAt: null 
    })
    .where(eq(userAuth.email, email))
    .returning();

  if (result.length === 0) {
    throw new Error("User not found or password update failed");
  }
  
  return "Password updated successfully";
};

// Set password reset token
export const setPasswordResetTokenService = async (
  email: string,
  resetToken: string,
  expiresAt: Date
): Promise<void> => {
  await db.update(userAuth)
    .set({ 
      resetToken,
      resetTokenExpiresAt: expiresAt
    })
    .where(eq(userAuth.email, email));
};

// Verify reset token
export const verifyResetTokenService = async (
  email: string,
  token: string
): Promise<boolean> => {
  const result = await db.query.userAuth.findFirst({
    where: and(
      eq(userAuth.email, email),
      eq(userAuth.resetToken, token),
      gt(userAuth.resetTokenExpiresAt, new Date())
    ),
  });

  return !!result;
};

// Create refresh token
export const createRefreshTokenService = async (
  data: TCreateRefreshTokenData
): Promise<string> => {
  const [refreshToken] = await db.insert(refreshTokens)
    .values(data)
    .returning();
  
  return refreshToken.token;
};

// Get refresh token
export const getRefreshTokenService = async (
  token: string
) => {
  return await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, token),
      gt(refreshTokens.expiresAt, new Date()),
      eq(refreshTokens.isRevoked, false)
    ),
    with: {
      user: {
        with: {
          userAuth: true,
        },
      },
    },
  });
};

// Revoke refresh token
export const revokeRefreshTokenService = async (
  token: string
): Promise<void> => {
  await db.update(refreshTokens)
    .set({ 
      isRevoked: true,
      revokedAt: new Date()
    })
    .where(eq(refreshTokens.token, token));
};

// Revoke all user refresh tokens
export const revokeAllUserRefreshTokensService = async (
  userId: string
): Promise<void> => {
  await db.update(refreshTokens)
    .set({ 
      isRevoked: true,
      revokedAt: new Date()
    })
    .where(eq(refreshTokens.userId, userId));
};