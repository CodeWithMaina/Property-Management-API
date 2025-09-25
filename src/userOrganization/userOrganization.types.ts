// user-organization.types.ts
import { UserOrganization, User } from "../drizzle/schema";
import { UserRoleEnum } from "../drizzle/schema";

export interface UserOrganizationWithUser extends UserOrganization {
  user: Pick<User, 'id' | 'fullName' | 'email' | 'phone' | 'avatarUrl' | 'isActive'>;
}

export interface UserOrganizationInput {
  userId: string;
  organizationId: string;
  role: UserRoleEnum;
  isPrimary: boolean;
  permissions?: {
    canManageProperties?: boolean;
    canManageUnits?: boolean;
    canManageLeases?: boolean;
    canManageTenants?: boolean;
    canManageInvoices?: boolean;
    canManagePayments?: boolean;
    canManageMaintenance?: boolean;
    canManageUsers?: boolean;
    canViewReports?: boolean;
  };
}

export interface RoleUpdateInput {
  role: UserRoleEnum;
}

export interface PrimaryOrganizationInput {
  isPrimary: boolean;
}