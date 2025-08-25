// auth.types.ts
import { JwtPayload } from "jsonwebtoken";

export type TLoginRequest = {
  email: string;
  password: string;
};

export type TRegisterRequest = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
};

export type TAuthResponse = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    phone?: string;
  };
};

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

export type TJwtPayload = JwtPayload & {
  userId: string;
  email: string;
  role: string;
};

export type TUserSession = {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

// Service types
export type TCreateUserData = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
};

export type TUpdatePasswordData = {
  email: string;
  password: string;
};

export type TCreateRefreshTokenData = {
  userId: string;
  token: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
};