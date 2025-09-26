import { Request } from 'express';
import { PropertyManagerPermissions, UserOrganizationPermissions, UserRoleEnum } from "../../drizzle/schema";

export interface AuthorizationRequest extends Request {
  user?: TEnhancedUserSession;
}

export interface TEnhancedUserSession {
  // JWT payload properties
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
  
  // Enhanced user data
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string | null;
    isActive: boolean;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  organizations: UserOrganizationInfo[];
  managedProperties: PropertyManagerInfo[];
  
  // Primary organization and role for quick access
  primaryOrganization?: {
    id: string;
    organizationId: string;
    organizationName: string;
    role: UserRoleEnum;
  };
}

export interface UserOrganizationInfo {
  id: string;
  organizationId: string;
  organizationName: string;
  role: UserRoleEnum;
  isPrimary: boolean;
  permissions: UserOrganizationPermissions;
}

export interface PropertyManagerInfo {
  id: string;
  propertyId: string;
  propertyName: string;
  organizationId: string;
  role: UserRoleEnum;
  permissions: PropertyManagerPermissions;
}

export interface AuthorizationOptions {
  allowedRoles?: UserRoleEnum[];
  allowOwner?: boolean;
  allowPropertyManager?: boolean;
  allowSameOrganization?: boolean;
  resourceType?: 'organization' | 'property' | 'unit' | 'lease' | 'invoice' | 'maintenance' | 'user';
  requiredPermissions?: string[];
  customCheck?: (req: AuthorizationRequest) => Promise<boolean>;
}

export interface ResourceContext {
  organizationId?: string;
  propertyId?: string;
  ownerId?: string;
  resource?: any;
}
// export interface AuthorizationRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     fullName: string;
//     organizations: UserOrganizationInfo[];
//     managedProperties: PropertyManagerInfo[];
//   };
// }

export interface UserOrganizationInfo {
  id: string;
  organizationId: string;
  role: UserRoleEnum;
  isPrimary: boolean;
}

export interface PropertyManagerInfo {
  id: string;
  propertyId: string;
  role: UserRoleEnum;
}

export interface AuthorizationOptions {
  allowedRoles?: UserRoleEnum[];
  allowOwner?: boolean;
  allowPropertyManager?: boolean;
  allowSameOrganization?: boolean;
  resourceType?: 'organization' | 'property' | 'unit' | 'lease' | 'invoice' | 'maintenance' | 'user';
  customCheck?: (req: AuthorizationRequest) => Promise<boolean>;
}

export interface ResourceOrganizationMapping {
  resourceType: string;
  organizationIdPath: string;
  ownerIdPath?: string;
  propertyIdPath?: string;
}