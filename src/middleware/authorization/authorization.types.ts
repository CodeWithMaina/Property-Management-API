import { Request } from 'express';
import { UserRoleEnum } from "../../drizzle/schema";

export interface AuthorizationRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    organizations: UserOrganizationInfo[];
    managedProperties: PropertyManagerInfo[];
  };
}

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
  resourceType?: 'user' | 'property' | 'unit' | 'lease' | 'invoice' | 'payment' | 'maintenanceRequest';
  customCheck?: (req: AuthorizationRequest) => Promise<boolean>;
}

export interface ResourceOrganizationMapping {
  resourceType: string;
  organizationIdPath: string;
  ownerIdPath?: string;
  propertyIdPath?: string;
}