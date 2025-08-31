// user.types.ts
import { User, UserOrganization, PropertyManager, UserRoleEnum } from "../drizzle/schema";

export interface UserResponse extends User {
  userOrganizations?: UserOrganization[];
  propertyManagers?: PropertyManager[];
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface UserFilters {
  isActive?: boolean;
  search?: string;
  role?: UserRoleEnum;
  organizationId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsers {
  data: UserResponse[];
  pagination: {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
    links?: {
      first: string | null;
      last: string | null;
      prev: string | null;
      next: string | null;
    };
  };
}

export interface SearchUsersInput {
  email?: string;
  phone?: string;
}

export interface InviteUserInput {
  email: string;
  organizationId: string;
  role: UserRoleEnum;
}

export interface AcceptInviteInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}