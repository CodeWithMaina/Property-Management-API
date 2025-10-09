import { UserRole, User, Organization, Property, Unit } from "../drizzle/schema";

export interface CreateInvitationData {
  email: string;
  role: UserRole;
  organizationId?: string;
  propertyId?: string;
  unitId?: string;
  permissions?: Record<string, boolean | number | string>;
  expiresInHours?: number;
  invitedByUserId: string;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  permissions: Record<string, boolean | number | string>;
  invitedByUserId?: string;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  propertyId?: string;
  unitId?: string;
  invitedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
}

export interface AcceptInvitationResult {
  user: User;
  organization?: Organization;
  property?: Property;
  unit?: Unit;
}

export type InvitationScope = 'global' | 'organization' | 'property' | 'unit';

export interface PermissionContext {
  organizationId?: string;
  propertyId?: string;
  unitId?: string;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  superAdmin: 100,
  admin: 90,
  propertyOwner: 80,
  manager: 70,
  caretaker: 60,
  tenant: 50,
};