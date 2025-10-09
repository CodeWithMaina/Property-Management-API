// services/auth/auth.enhanced.types.ts

import { ActivityAction, UserRole } from "../drizzle/schema";

export type PERMISSION = Record<string, boolean | number | string>;
export interface RegistrationData {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  organizationName?: string;
  organizationId?: string;
  role?: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
  deviceId?: string;
  userAgent?: string;
  mfaToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  userId?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  orgId?: string;
  roles: UserRole[];
  permissions: PERMISSION;
  deviceId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  deviceId?: string;
}

export interface PasswordResetData {
  token: string;
  password: string;
}

export interface UserContext {
  userId: string;
  fullName?: string;
  email: string;
  roles: UserRole[];
  permissions: PERMISSION;
  organizationId?: string;
  propertyId?: string;
  unitId?: string;
  deviceId?: string;
  isActive?: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
}

export interface AuthAuditLog {
  id: string;
  userId: string;
  action: ActivityAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  userId?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  organizationId?: string;
  propertyId?: string;
  unitId?: string;
  permissions?: Record<string, any>;
  invitedByUserId: string;
  expiresInHours?: number;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string; 
  role: UserRole;
  propertyId?: string;
  unitId?: string;
  permissions: PERMISSION;
  invitedByUserId?: string;
  token: string;
  // Remove status field since it doesn't exist in schema
  // status: 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
  updatedAt?: Date;
  // Use the actual fields from your schema
  isUsed: boolean;
  usedAt?: Date;
  // Optional relations
  organization?: any;
  property?: any;
  unit?: any;
  invitedBy?: any;
}

export interface AcceptInvitationResult {
  user: any;
  organization?: any;
  property?: any;
  unit?: any;
}

export interface PermissionContext {
  organizationId?: string;
  propertyId?: string;
  unitId?: string;
}

export type InvitationScope = 'global' | 'organization' | 'property' | 'unit';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superAdmin: 100,
  admin: 90,
  propertyOwner: 80,
  manager: 70,
  caretaker: 60,
  tenant: 50,
//   guest: 40
};

export const PASSWORD_CONFIG = {
  minLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  saltRounds: 12,
  maxAttempts: 5,
  lockoutDuration: 30 * 60 * 1000 // 30 minutes
};

export const DEFAULT_AUTH_CONFIG = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '30d',
  mfaRequired: false
};


export interface UserOrganizationPermissions {
  // Property Management
  canManageProperties?: boolean;
  canCreateProperties?: boolean;
  canDeleteProperties?: boolean;
  maxProperties?: number;
  
  // Unit Management
  canManageUnits?: boolean;
  canCreateUnits?: boolean;
  canDeleteUnits?: boolean;
  
  // Lease Management
  canManageLeases?: boolean;
  canCreateLeases?: boolean;
  canTerminateLeases?: boolean;
  
  // Tenant Management
  canManageTenants?: boolean;
  canInviteTenants?: boolean;
  canRemoveTenants?: boolean;
  
  // Financial Management
  canManageInvoices?: boolean;
  canIssueInvoices?: boolean;
  canVoidInvoices?: boolean;
  canManagePayments?: boolean;
  canRecordPayments?: boolean;
  canViewFinancialReports?: boolean;
  
  // Maintenance Management
  canManageMaintenance?: boolean;
  canCreateMaintenance?: boolean;
  canAssignMaintenance?: boolean;
  canApproveMaintenanceCosts?: boolean;
  
  // User Management
  canManageUsers?: boolean;
  canInviteUsers?: boolean;
  canRemoveUsers?: boolean;
  canChangeUserRoles?: boolean;
  
  // System Access
  canViewAuditLogs?: boolean;
  canManageOrganizationSettings?: boolean;
}