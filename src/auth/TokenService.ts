// services/auth/TokenService.ts
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import db from "../drizzle/db";
import { refreshTokens } from "../drizzle/schema";
import { TokenPayload, RefreshTokenPayload } from "./auth.types";

export class TokenService {
  private readonly ACCESS_TOKEN_SECRET =
    process.env.JWT_SECRET || "fallback-secret";
  private readonly REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET || "fallback-refresh-secret";

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
      issuer: "property-management-api",
      audience: "property-management-app",
    });
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    const token = jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: "30d",
      issuer: "property-management-api",
      audience: "property-management-app",
    });
    return token;
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
      issuer: "property-management-api",
      audience: "property-management-app",
    }) as TokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
      issuer: "property-management-api",
      audience: "property-management-app",
    }) as RefreshTokenPayload;
  }

  async storeRefreshToken(
    userId: string,
    token: string,
    deviceId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(refreshTokens).values({
      userId,
      token,
      deviceId,
      userAgent,
      ipAddress,
      expiresAt,
    });
  }

  async verifyStoredRefreshToken(
    token: string
  ): Promise<{ isValid: boolean; userId?: string }> {
    try {
      // First verify JWT signature
      const payload = this.verifyRefreshToken(token);

      // Then check if token exists in database and is not revoked
      const storedToken = await db.query.refreshTokens.findFirst({
        where: and(
          eq(refreshTokens.token, token),
          eq(refreshTokens.isRevoked, false),
          eq(refreshTokens.userId, payload.userId),
          gt(refreshTokens.expiresAt, new Date()) // Check expiration
        ),
      });

      if (!storedToken) {
        return { isValid: false };
      }

      return { isValid: true, userId: payload.userId };
    } catch (error) {
      return { isValid: false };
    }
  }

  async revokeToken(token: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
      })
      .where(eq(refreshTokens.token, token));
  }

  async revokeDeviceTokens(userId: string, deviceId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.deviceId, deviceId),
          eq(refreshTokens.isRevoked, false)
        )
      );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false)
        )
      );
  }

  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString("hex");
  }
}
