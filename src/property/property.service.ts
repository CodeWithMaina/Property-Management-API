import { eq, and, desc, sql } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  properties, 
  Property, 
  PropertyManager, 
  propertyManagers, 
  users, 
} from "../drizzle/schema";
import { PartialPropertyInput, PropertyInput, PropertyManagerInput, PropertyQueryParams } from "./property.validator";

/**
 * Get all properties with optional filtering and pagination
 */
export const getPropertiesServices = async (
  queryParams: PropertyQueryParams
): Promise<{ properties: Property[]; total: number }> => {
  const { organizationId, isActive, page, limit } = queryParams;
  const offset = (page - 1) * limit;

  console.log('Query params received:', queryParams);

  // Build where conditions
  const whereConditions = [];
  
  if (organizationId) {
    whereConditions.push(eq(properties.organizationId, organizationId));
  }
  
  // Handle isActive parameter - if undefined, don't filter by isActive
  if (isActive !== undefined) {
    whereConditions.push(eq(properties.isActive, isActive));
  }

  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get properties with organization details
    const propertiesList = await db.query.properties.findMany({
      where: whereClause,
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
            legalName: true,
          }
        },
        propertyManagers: {
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
        }
      },
      orderBy: [desc(properties.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties)
      .where(whereClause || sql`1=1`);

    const total = totalResult[0]?.count || 0;

    return {
      properties: propertiesList,
      total,
    };
  } catch (error) {
    console.error('Error in getPropertiesServices:', error);
    throw error;
  }
};

/**
 * Get property by ID with detailed information
 */
export const getPropertyByIdServices = async (
  propertyId: string
): Promise<Property | undefined> => {
  return await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
          legalName: true,
          taxId: true,
        }
      },
      propertyManagers: {
        with: {
          user: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            }
          }
        }
      },
      units: {
        columns: {
          id: true,
          code: true,
          floor: true,
          bedrooms: true,
          bathrooms: true,
          status: true,
          baseRent: true,
        }
      }
    }
  });
};

/**
 * Create a new property - FIXED to handle null values
 */
export const createPropertyServices = async (
  propertyData: PropertyInput
): Promise<Property> => {
  // Prepare data for insertion, converting undefined to null
  const insertData = {
    organizationId: propertyData.organizationId,
    name: propertyData.name,
    description: propertyData.description || null,
    addressLine1: propertyData.addressLine1 || null,
    addressLine2: propertyData.addressLine2 || null,
    city: propertyData.city || null,
    state: propertyData.state || null,
    postalCode: propertyData.postalCode || null,
    country: propertyData.country || null,
    timezone: propertyData.timezone || null,
    isActive: propertyData.isActive,
    metadata: propertyData.metadata || {},
  };

  const result = await db.insert(properties)
    .values(insertData)
    .returning();
  
  return result[0];
};

/**
 * Update an existing property - FIXED to handle null values
 */
export const updatePropertyServices = async (
  propertyId: string,
  propertyData: PartialPropertyInput
): Promise<Property> => {
  // Prepare update data, handling null values properly
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are provided
  if (propertyData.name !== undefined) updateData.name = propertyData.name;
  if (propertyData.description !== undefined) updateData.description = propertyData.description || null;
  if (propertyData.addressLine1 !== undefined) updateData.addressLine1 = propertyData.addressLine1 || null;
  if (propertyData.addressLine2 !== undefined) updateData.addressLine2 = propertyData.addressLine2 || null;
  if (propertyData.city !== undefined) updateData.city = propertyData.city || null;
  if (propertyData.state !== undefined) updateData.state = propertyData.state || null;
  if (propertyData.postalCode !== undefined) updateData.postalCode = propertyData.postalCode || null;
  if (propertyData.country !== undefined) updateData.country = propertyData.country || null;
  if (propertyData.timezone !== undefined) updateData.timezone = propertyData.timezone || null;
  if (propertyData.isActive !== undefined) updateData.isActive = propertyData.isActive;
  if (propertyData.metadata !== undefined) updateData.metadata = propertyData.metadata || {};

  const result = await db.update(properties)
    .set(updateData)
    .where(eq(properties.id, propertyId))
    .returning();
  
  return result[0];
};

/**
 * Delete a property (soft delete by setting isActive to false)
 */
export const deletePropertyServices = async (
  propertyId: string
): Promise<Property> => {
  const result = await db.update(properties)
    .set({ 
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, propertyId))
    .returning();
  
  return result[0];
};

/**
 * Get all managers for a specific property
 */
export const getPropertyManagersServices = async (
  propertyId: string
): Promise<PropertyManager[]> => {
  return await db.query.propertyManagers.findMany({
    where: eq(propertyManagers.propertyId, propertyId),
    with: {
      user: {
        columns: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
        }
      }
    }
  });
};

/**
 * Assign a manager to a property
 */
export const assignPropertyManagerServices = async (
  propertyId: string,
  managerData: PropertyManagerInput
): Promise<PropertyManager> => {
  // Check if user exists
  const userExists = await db.query.users.findFirst({
    where: eq(users.id, managerData.userId),
    columns: { id: true }
  });

  if (!userExists) {
    throw new Error("User not found");
  }

  // Check if property exists
  const propertyExists = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    columns: { id: true }
  });

  if (!propertyExists) {
    throw new Error("Property not found");
  }

  // Check if manager is already assigned
  const existingAssignment = await db.query.propertyManagers.findFirst({
    where: and(
      eq(propertyManagers.propertyId, propertyId),
      eq(propertyManagers.userId, managerData.userId)
    )
  });

  if (existingAssignment) {
    throw new Error("Manager is already assigned to this property");
  }

  const result = await db.insert(propertyManagers)
    .values({
      propertyId,
      ...managerData,
    })
    .returning();
  
  return result[0];
};

/**
 * Remove a manager from a property
 */
export const removePropertyManagerServices = async (
  propertyId: string,
  userId: string
): Promise<PropertyManager> => {
  const result = await db.delete(propertyManagers)
    .where(and(
      eq(propertyManagers.propertyId, propertyId),
      eq(propertyManagers.userId, userId)
    ))
    .returning();
  
  if (result.length === 0) {
    throw new Error("Manager assignment not found");
  }
  
  return result[0];
};