// auth/auth.types.ts
import { JwtPayload } from "jsonwebtoken";
import { UserRoleEnum, UserOrganizationPermissions, PropertyManagerPermissions } from "../drizzle/schema";

// Request types
export type TLoginRequest = {
  email: string;
  password: string;
};


export type TEnhancedUserSession = TUserSession & {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
    isActive: boolean;
    avatarUrl?: string;
    createdAt: Date;
  };
  organizations: UserOrganizationInfo[];
  managedProperties: PropertyManagerInfo[];
};

export type UserOrganizationInfo = {
  id: string;
  organizationId: string;
  organizationName: string;
  role: UserRoleEnum;
  isPrimary: boolean;
  permissions: UserOrganizationPermissions;
};

export type PropertyManagerInfo = {
  id: string;
  propertyId: string;
  propertyName: string;
  organizationId: string;
  role: UserRoleEnum;
  permissions: PropertyManagerPermissions;
};

// Service types


// export type TCreateRefreshTokenData = {
//   userId: string;
//   token: string;
//   deviceId?: string;
//   userAgent?: string;
//   ipAddress?: string;
//   expiresAt: Date;
// };


// Request types

export type TRegisterRequest = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRoleEnum;
};

// export type TAuthResponse = {
//   token: string;
//   refreshToken: string;
//   user: {
//     id: string;
//     name: string;
//     email: string;
//     role: string;
//     phone?: string;
//   };
// };

export type TRefreshTokenRequest = {
  refreshToken: string;
};

export type TForgotPasswordRequest = {
  email: string;
};

export type TResetPasswordRequest = {
  token: string;
  password: string;
};

export type TChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

// JWT and Session types
export interface TJwtPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TUserSession extends TJwtPayload {
  iat: number;
  exp: number;
}

// Service types
// export type TCreateUserData = {
//   name: string;
//   email: string;
//   password: string;
//   phone?: string;
//   role?: UserRoleEnum;
// };

export type TUpdatePasswordData = {
  email: string;
  password: string;
};



export interface TJwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TUserSession {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface TAuthResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
  };
}

export interface TCreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface TCreateRefreshTokenData {
  userId: string;
  token: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}
