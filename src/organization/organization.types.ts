// organization.types.ts
import { Organization as OrgType, Property } from "../drizzle/schema";

export interface OrganizationWithRelations extends OrgType {
  userOrganizations: {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    isPrimary: boolean;
    createdAt: Date;
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl?: string;
    };
  }[];
  properties: Pick<Property, 'id' | 'name' | 'isActive'>[];
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrganizationQueryParams {
  page: number;
  limit: number;
  isActive?: boolean;
  search?: string;
}