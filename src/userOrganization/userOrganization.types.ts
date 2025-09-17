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
}

export interface RoleUpdateInput {
  role: UserRoleEnum;
}

export interface PrimaryOrganizationInput {
  isPrimary: boolean;
}