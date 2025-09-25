// user-organization.service.ts
import { eq, and, desc } from "drizzle-orm";
import db from "../drizzle/db";
import { userOrganizations, users, organizations } from "../drizzle/schema";
import { PrimaryOrganizationInput, UserOrganizationWithUser, UserOrganizationInput, RoleUpdateInput  } from "./userOrganization.types";

export const getOrganizationUsersServices = async (
  organizationId: string
): Promise<UserOrganizationWithUser[]> => {
  try {
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
  } catch (error) {
    console.error('Error in getOrganizationUsersServices:', error);
    throw new Error('Failed to fetch organization users');
  }
};

export const addUserToOrganizationServices = async (
  userOrgData: UserOrganizationInput
) => {
  try {
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, userOrgData.userId),
      columns: { id: true }
    });

    if (!userExists) {
      throw new Error("User not found");
    }

    const orgExists = await db.query.organizations.findFirst({
      where: eq(organizations.id, userOrgData.organizationId),
      columns: { id: true }
    });

    if (!orgExists) {
      throw new Error("Organization not found");
    }

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
      .values({
        userId: userOrgData.userId,
        organizationId: userOrgData.organizationId,
        role: userOrgData.role,
        isPrimary: userOrgData.isPrimary,
        permissions: userOrgData.permissions || {}, // Add permissions field
      })
      .returning();
    
    return result[0];
  } catch (error) {
    console.error('Error in addUserToOrganizationServices:', error);
    throw error;
  }
};

export const updateUserRoleServices = async (
  userOrganizationId: string,
  roleData: RoleUpdateInput
) => {
  try {
    const result = await db.update(userOrganizations)
      .set({ 
        role: roleData.role,
        updatedAt: new Date(),
      })
      .where(eq(userOrganizations.id, userOrganizationId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User organization membership not found");
    }
    
    return result[0];
  } catch (error) {
    console.error('Error in updateUserRoleServices:', error);
    throw new Error('Failed to update user role');
  }
};

export const setPrimaryOrganizationServices = async (
  userOrganizationId: string,
  primaryData: PrimaryOrganizationInput
) => {
  try {
    const userOrg = await db.query.userOrganizations.findFirst({
      where: eq(userOrganizations.id, userOrganizationId),
      columns: { userId: true }
    });

    if (!userOrg) {
      throw new Error("User organization membership not found");
    }

    if (primaryData.isPrimary) {
      await db.update(userOrganizations)
        .set({ isPrimary: false })
        .where(eq(userOrganizations.userId, userOrg.userId));
    }

    const result = await db.update(userOrganizations)
      .set({ 
        isPrimary: primaryData.isPrimary,
        updatedAt: new Date(),
      })
      .where(eq(userOrganizations.id, userOrganizationId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User organization membership not found");
    }
    
    return result[0];
  } catch (error) {
    console.error('Error in setPrimaryOrganizationServices:', error);
    throw new Error('Failed to set primary organization');
  }
};

export const removeUserFromOrganizationServices = async (
  userOrganizationId: string
) => {
  try {
    const result = await db.delete(userOrganizations)
      .where(eq(userOrganizations.id, userOrganizationId))
      .returning();
    
    if (result.length === 0) {
      throw new Error("User organization membership not found");
    }
    
    return result[0];
  } catch (error) {
    console.error('Error in removeUserFromOrganizationServices:', error);
    throw new Error('Failed to remove user from organization');
  }
};