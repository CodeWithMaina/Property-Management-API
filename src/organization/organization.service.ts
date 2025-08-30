// organization.service.ts
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  organizations, 
  Organization, 
  UserOrganization, 
  userOrganizations, 
  users,
  properties,
  User,
  Property
} from "../drizzle/schema";
import { 
  OrganizationInput, 
  PartialOrganizationInput, 
  UserOrganizationInput, 
  RoleUpdateInput, 
  PrimaryOrganizationInput, 
  OrganizationQueryParams 
} from "./organization.validator";

/**
 * Get all organizations with optional filtering and pagination
 */
export const getOrganizationsServices = async (
  queryParams: OrganizationQueryParams,
  userId?: string // Optional user ID to scope organizations
): Promise<{ organizations: Organization[]; total: number }> => {
  const { page, limit, isActive, search } = queryParams;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];
  
  if (isActive !== undefined) {
    whereConditions.push(eq(organizations.isActive, isActive));
  }
  
  if (search) {
    whereConditions.push(
      or(
        like(organizations.name, `%${search}%`),
        like(organizations.legalName, `%${search}%`),
        like(organizations.taxId, `%${search}%`)
      )
    );
  }

  // If user ID is provided, only return organizations the user belongs to
  if (userId) {
    const userOrgSubquery = db
      .select({ organizationId: userOrganizations.organizationId })
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, userId));

    whereConditions.push(sql`${organizations.id} IN ${userOrgSubquery}`);
  }

  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get organizations
    const organizationsList = await db.query.organizations.findMany({
      where: whereClause,
      with: {
        userOrganizations: {
          with: {
            user: {
              columns: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              }
            }
          }
        },
        properties: {
          columns: {
            id: true,
            name: true,
            isActive: true,
          }
        }
      },
      orderBy: [desc(organizations.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(whereClause || sql`1=1`);

    const total = totalResult[0]?.count || 0;

    return {
      organizations: organizationsList,
      total,
    };
  } catch (error) {
    console.error('Error in getOrganizationsServices:', error);
    throw error;
  }
};

/**
 * Get organization by ID with detailed information
 */
export const getOrganizationByIdServices = async (
  organizationId: string
): Promise<Organization | undefined> => {
  return await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    with: {
      userOrganizations: {
        with: {
          user: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
              isActive: true,
            }
          }
        }
      },
      properties: {
        columns: {
          id: true,
          name: true,
          addressLine1: true,
          city: true,
          country: true,
          isActive: true,
        }
      }
    }
  });
};

/**
 * Create a new organization
 */
export const createOrganizationServices = async (
  organizationData: OrganizationInput
): Promise<Organization> => {
  const result = await db.insert(organizations)
    .values({
      ...organizationData,
      legalName: organizationData.legalName || null,
      taxId: organizationData.taxId || null,
      metadata: organizationData.metadata || {},
    })
    .returning();
  
  return result[0];
};

/**
 * Update an existing organization
 */
export const updateOrganizationServices = async (
  organizationId: string,
  organizationData: PartialOrganizationInput
): Promise<Organization> => {
  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are provided
  if (organizationData.name !== undefined) updateData.name = organizationData.name;
  if (organizationData.legalName !== undefined) updateData.legalName = organizationData.legalName || null;
  if (organizationData.taxId !== undefined) updateData.taxId = organizationData.taxId || null;
  if (organizationData.isActive !== undefined) updateData.isActive = organizationData.isActive;
  if (organizationData.metadata !== undefined) updateData.metadata = organizationData.metadata || {};

  const result = await db.update(organizations)
    .set(updateData)
    .where(eq(organizations.id, organizationId))
    .returning();
  
  return result[0];
};

/**
 * Delete an organization (soft delete by setting isActive to false)
 */
export const deleteOrganizationServices = async (
  organizationId: string
): Promise<Organization> => {
  const result = await db.update(organizations)
    .set({ 
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();
  
  return result[0];
};

/**
 * Get all users for a specific organization
 */
export const getOrganizationUsersServices = async (
  organizationId: string
): Promise<UserOrganization[]> => {
  return await db.query.userOrganizations.findMany({
    where: eq(userOrganizations.organizationId, organizationId),
    with: {
      user: {
        columns: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
        }
      }
    },
    orderBy: [desc(userOrganizations.createdAt)],
  });
};

/**
 * Add a user to an organization
 */
export const addUserToOrganizationServices = async (
  userOrgData: UserOrganizationInput
): Promise<UserOrganization> => {
  // Check if user exists
  const userExists = await db.query.users.findFirst({
    where: eq(users.id, userOrgData.userId),
    columns: { id: true }
  });

  if (!userExists) {
    throw new Error("User not found");
  }

  // Check if organization exists
  const orgExists = await db.query.organizations.findFirst({
    where: eq(organizations.id, userOrgData.organizationId),
    columns: { id: true }
  });

  if (!orgExists) {
    throw new Error("Organization not found");
  }

  // Check if user is already in organization
  const existingMembership = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.organizationId, userOrgData.organizationId),
      eq(userOrganizations.userId, userOrgData.userId)
    )
  });

  if (existingMembership) {
    throw new Error("User is already a member of this organization");
  }

  const result = await db.insert(userOrganizations)
    .values(userOrgData)
    .returning();
  
  return result[0];
};

/**
 * Update a user's role in an organization
 */
export const updateUserRoleServices = async (
  userOrganizationId: string,
  roleData: RoleUpdateInput
): Promise<UserOrganization> => {
  const result = await db.update(userOrganizations)
    .set({ 
      role: roleData.role,
    })
    .where(eq(userOrganizations.id, userOrganizationId))
    .returning();
  
  if (result.length === 0) {
    throw new Error("User organization membership not found");
  }
  
  return result[0];
};

/**
 * Set a user's primary organization
 */
export const setPrimaryOrganizationServices = async (
  userOrganizationId: string,
  primaryData: PrimaryOrganizationInput
): Promise<UserOrganization> => {
  // If setting as primary, first remove primary status from all other user organizations
  if (primaryData.isPrimary) {
    const userOrg = await db.query.userOrganizations.findFirst({
      where: eq(userOrganizations.id, userOrganizationId),
      columns: { userId: true }
    });

    if (userOrg) {
      await db.update(userOrganizations)
        .set({ isPrimary: false })
        .where(eq(userOrganizations.userId, userOrg.userId));
    }
  }

  const result = await db.update(userOrganizations)
    .set({ 
      isPrimary: primaryData.isPrimary,
    })
    .where(eq(userOrganizations.id, userOrganizationId))
    .returning();
  
  if (result.length === 0) {
    throw new Error("User organization membership not found");
  }
  
  return result[0];
};

/**
 * Remove a user from an organization
 */
export const removeUserFromOrganizationServices = async (
  userOrganizationId: string
): Promise<UserOrganization> => {
  const result = await db.delete(userOrganizations)
    .where(eq(userOrganizations.id, userOrganizationId))
    .returning();
  
  if (result.length === 0) {
    throw new Error("User organization membership not found");
  }
  
  return result[0];
};