// types/auth.types.ts
import { z } from "zod";
import { User, UserRoleEnum, UserOrganization } from "../drizzle/schema";

/**
 * 🔐 Extended user type with authentication data
 */
export type TUserAuth = {
  id: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  lastLoginAt: Date | null;
  mfaEnabled: boolean;
  verificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiresAt: Date | null;
  mfaSecret: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export type TUserWithAuth = User & {
  userAuth?: TUserAuth;
  userOrganizations?: (UserOrganization & {
    organization: {
      id: string;
      name: string;
      legalName: string | null;
      isActive: boolean;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
      updatedAt: Date;
    };
  })[];
};

export type TJWTPayload = {
  userId: string;
  email: string;
  orgId?: string;
  roles: UserRoleEnum[];
  permissions: Record<string, boolean | number | string>;
  deviceId?: string;
  iat?: number;
  exp?: number;
};

export type TAuthRequest = Request & {
  user?: TUserWithAuth;
  orgId?: string;
  permissions?: Record<string, boolean | number | string>;
  deviceId?: string;
};