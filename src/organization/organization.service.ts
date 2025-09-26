// organization.service.ts
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import db from "../drizzle/db";
import { organizations, userOrganizations, users, properties } from "../drizzle/schema";
import { OrganizationInput, PartialOrganizationInput, OrganizationQueryParams } from "./organization.validator";
import { OrganizationWithRelations } from "./organization.types";

// organization.service.ts - Update the getOrganizationsServices function
export const getOrganizationsServices = async (
  queryParams: OrganizationQueryParams,
  userId?: string
): Promise<{ organizations: OrganizationWithRelations[]; total: number }> => {
  const { page, limit, isActive, search } = queryParams;
  const offset = (page - 1) * limit;

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

  // If userId is provided, filter by user's organizations
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

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(whereClause || sql`1=1`);

    const total = totalResult[0]?.count || 0;

    return {
      organizations: organizationsList as OrganizationWithRelations[],
      total,
    };
  } catch (error) {
    console.error('Error in getOrganizationsServices:', error);
    throw new Error('Failed to fetch organizations');
  }
};

export const getOrganizationByIdServices = async (
  organizationId: string
): Promise<OrganizationWithRelations | undefined> => {
  try {
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
    }) as OrganizationWithRelations | undefined;
  } catch (error) {
    console.error('Error in getOrganizationByIdServices:', error);
    throw new Error('Failed to fetch organization');
  }
};

export const createOrganizationServices = async (
  organizationData: OrganizationInput
) => {
  try {
    const result = await db.insert(organizations)
      .values({
        ...organizationData,
        legalName: organizationData.legalName || null,
        taxId: organizationData.taxId || null,
        metadata: organizationData.metadata || {},
      })
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error in createOrganizationServices:', error);
    throw new Error('Failed to create organization');
  }
};

export const updateOrganizationServices = async (
  organizationId: string,
  organizationData: PartialOrganizationInput
) => {
  try {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (organizationData.name !== undefined) updateData.name = organizationData.name;
    if (organizationData.legalName !== undefined) updateData.legalName = organizationData.legalName || null;
    if (organizationData.taxId !== undefined) updateData.taxId = organizationData.taxId || null;
    if (organizationData.isActive !== undefined) updateData.isActive = organizationData.isActive;
    if (organizationData.metadata !== undefined) updateData.metadata = organizationData.metadata || {};

    const result = await db.update(organizations)
      .set(updateData)
      .where(eq(organizations.id, organizationId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Organization not found");
    }
    
    return result[0];
  } catch (error) {
    console.error('Error in updateOrganizationServices:', error);
    throw new Error('Failed to update organization');
  }
};

export const deleteOrganizationServices = async (organizationId: string) => {
  try {
    const result = await db.update(organizations)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Organization not found");
    }
    
    return result[0];
  } catch (error) {
    console.error('Error in deleteOrganizationServices:', error);
    throw new Error('Failed to delete organization');
  }
};