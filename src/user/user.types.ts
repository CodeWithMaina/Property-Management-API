import { PropertyManager, User, UserOrganization } from "../drizzle/schema";

export interface UserResponse extends User {
  organizations?: UserOrganization[];
  managedProperties?: PropertyManager[];
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
  };
}