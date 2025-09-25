// amenities.service.ts
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  amenities, 
  Amenity, 
  unitAmenities,
  units,
  properties,
  organizations
} from "../drizzle/schema";
import { AmenityQueryParams, AmenityInput, PartialAmenityInput } from "./amenity.validator";

/**
 * Get all amenities with optional filtering and pagination
 */
export const getAmenitiesServices = async (
  queryParams: AmenityQueryParams
): Promise<{ amenities: Amenity[]; total: number }> => {
  const { organizationId, page, limit } = queryParams;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];
  
  if (organizationId) {
    whereConditions.push(eq(amenities.organizationId, organizationId));
  }

  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get amenities with organization details
    const amenitiesList = await db.query.amenities.findMany({
      where: whereClause,
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: [desc(amenities.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(amenities)
      .where(whereClause || sql`1=1`);

    const total = totalResult[0]?.count || 0;

    return {
      amenities: amenitiesList,
      total,
    };
  } catch (error) {
    console.error('Error in getAmenitiesServices:', error);
    throw error;
  }
};

/**
 * Get amenity by ID with detailed information
 */
// amenities.service.ts - Fixed version
export const getAmenityByIdServices = async (
  amenityId: string
): Promise<Amenity | undefined> => {
  try {
    return await db.query.amenities.findFirst({
      where: eq(amenities.id, amenityId),
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
            legalName: true,
          }
        },
        unitAmenities: {
          with: {
            unit: {
              columns: {
                id: true,
                code: true,
                propertyId: true,
              },
              with: {
                property: {
                  columns: {
                    id: true,
                    name: true,
                  }
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in getAmenityByIdServices:', error);
    throw error;
  }
};

/**
 * Get amenities by organization ID
 */
export const getAmenitiesByOrganizationServices = async (
  organizationId: string
): Promise<Amenity[]> => {
  return await db.query.amenities.findMany({
    where: eq(amenities.organizationId, organizationId),
    with: {
      organization: {
        columns: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: [desc(amenities.createdAt)],
  });
};

/**
 * Create a new amenity
 */
export const createAmenityServices = async (
  amenityData: AmenityInput
): Promise<Amenity> => {
  // Check if organization exists
  const organizationExists = await db.query.organizations.findFirst({
    where: eq(organizations.id, amenityData.organizationId),
    columns: { id: true }
  });

  if (!organizationExists) {
    throw new Error("Organization not found");
  }

  // Check if amenity with same name already exists in organization
  const existingAmenity = await db.query.amenities.findFirst({
    where: and(
      eq(amenities.organizationId, amenityData.organizationId),
      eq(amenities.name, amenityData.name)
    )
  });

  if (existingAmenity) {
    throw new Error("Amenity with this name already exists in this organization");
  }

  const result = await db.insert(amenities)
    .values({
      organizationId: amenityData.organizationId,
      name: amenityData.name,
      description: amenityData.description || null,
    })
    .returning();
  
  return result[0];
};

/**
 * Update an existing amenity
 */
export const updateAmenityServices = async (
  amenityId: string,
  amenityData: PartialAmenityInput
): Promise<Amenity> => {
  // Prepare update data
  const updateData: any = {};

  // Only include fields that are provided
  if (amenityData.name !== undefined) updateData.name = amenityData.name;
  if (amenityData.description !== undefined) updateData.description = amenityData.description || null;

  // If organizationId is being updated, verify the new organization exists
  if (amenityData.organizationId !== undefined) {
    const organizationExists = await db.query.organizations.findFirst({
      where: eq(organizations.id, amenityData.organizationId),
      columns: { id: true }
    });

    if (!organizationExists) {
      throw new Error("Organization not found");
    }
    
    updateData.organizationId = amenityData.organizationId;
  }

  // Check for name conflict if name is being updated
  if (amenityData.name !== undefined) {
    const existingAmenity = await db.query.amenities.findFirst({
      where: and(
        eq(amenities.organizationId, amenityData.organizationId || (await db.query.amenities.findFirst({
          where: eq(amenities.id, amenityId),
          columns: { organizationId: true }
        }))?.organizationId || ''),
        eq(amenities.name, amenityData.name),
        sql`id != ${amenityId}`
      )
    });

    if (existingAmenity) {
      throw new Error("Amenity with this name already exists in this organization");
    }
  }

  const result = await db.update(amenities)
    .set(updateData)
    .where(eq(amenities.id, amenityId))
    .returning();
  
  if (result.length === 0) {
    throw new Error("Amenity not found");
  }
  
  return result[0];
};

/**
 * Delete an amenity
 */
export const deleteAmenityServices = async (
  amenityId: string
): Promise<Amenity> => {
  // First check if amenity is used by any units
  const unitAmenitiesCount = await db.query.unitAmenities.findMany({
    where: eq(unitAmenities.amenityId, amenityId),
    columns: { id: true }
  });

  if (unitAmenitiesCount.length > 0) {
    throw new Error("Cannot delete amenity: it is currently assigned to units");
  }

  const result = await db.delete(amenities)
    .where(eq(amenities.id, amenityId))
    .returning();
  
  if (result.length === 0) {
    throw new Error("Amenity not found");
  }
  
  return result[0];
};