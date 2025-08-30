import { eq, and, desc, sql, inArray } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  units, 
  Unit, 
  unitAmenities, 
  amenities,
  properties,
  organizations,
  users,
  UnitStatusEnum,
  leases
} from "../drizzle/schema";
import { 
  UnitInput, 
  PartialUnitInput, 
  UnitQueryParams, 
  UnitAmenityInput,
  UnitStatusChangeInput
} from "./unit.validator";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errorHandler";

/**
 * Get all units with optional filtering and pagination
 */
export const getUnitsServices = async (
  queryParams: UnitQueryParams
): Promise<{ units: Unit[]; total: number }> => {
  const { propertyId, organizationId, status, isActive, page, limit } = queryParams;
  const offset = (page - 1) * limit;

  // Build where conditions
  const whereConditions = [];
  
  if (propertyId) {
    whereConditions.push(eq(units.propertyId, propertyId));
  }
  
  if (status) {
    whereConditions.push(eq(units.status, status));
  }
  
  if (isActive !== undefined) {
    whereConditions.push(eq(units.isActive, isActive));
  }

  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get units with property details
    let unitsQuery = db.query.units.findMany({
      where: whereClause,
      with: {
        property: {
          columns: {
            id: true,
            name: true,
            organizationId: true,
          },
          with: {
            organization: {
              columns: {
                id: true,
                name: true,
              }
            }
          }
        },
        unitAmenities: {
          with: {
            amenity: {
              columns: {
                id: true,
                name: true,
                description: true,
              }
            }
          }
        }
      },
      orderBy: [desc(units.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Apply organization filter if provided
    if (organizationId) {
      const unitsList = await unitsQuery;
      const filteredUnits = unitsList.filter(
        unit => unit.property.organizationId === organizationId
      );
      
      // Get total count for pagination
      const allUnits = await db.query.units.findMany({
        where: whereClause,
        with: {
          property: {
            columns: {
              organizationId: true,
            }
          }
        }
      });
      
      const total = allUnits.filter(
        unit => unit.property.organizationId === organizationId
      ).length;

      return {
        units: filteredUnits,
        total,
      };
    } else {
      const unitsList = await unitsQuery;

      // Get total count for pagination
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(units)
        .where(whereClause || sql`1=1`);

      const total = totalResult[0]?.count || 0;

      return {
        units: unitsList,
        total,
      };
    }
  } catch (error) {
    console.error('Error in getUnitsServices:', error);
    throw error;
  }
};

/**
 * Get unit by ID with detailed information
 */
export const getUnitByIdServices = async (
  unitId: string
): Promise<Unit | undefined> => {
  return await db.query.units.findFirst({
    where: eq(units.id, unitId),
    with: {
      property: {
        columns: {
          id: true,
          name: true,
          organizationId: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
        },
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
                }
              }
            }
          }
        }
      },
      unitAmenities: {
        with: {
          amenity: {
            columns: {
              id: true,
              name: true,
              description: true,
            }
          }
        }
      },
      leases: {
        where: (leases, { inArray }) => inArray(leases.status, ["active", "pendingMoveIn"]),
        columns: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          rentAmount: true,
        },
        with: {
          tenant: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            }
          }
        }
      }
    }
  });
};

/**
 * Create a new unit
 */
export const createUnitServices = async (
  unitData: UnitInput
): Promise<Unit> => {
  // Check if property exists
  const propertyExists = await db.query.properties.findFirst({
    where: eq(properties.id, unitData.propertyId),
    columns: { id: true }
  });

  if (!propertyExists) {
    throw new NotFoundError("Property");
  }

  // Check if unit code is unique within the property
  const existingUnit = await db.query.units.findFirst({
    where: and(
      eq(units.propertyId, unitData.propertyId),
      eq(units.code, unitData.code)
    )
  });

  if (existingUnit) {
    throw new ConflictError("Unit with this code already exists in the property");
  }

  // Prepare data for insertion
   const insertData = {
    propertyId: unitData.propertyId,
    code: unitData.code,
    floor: unitData.floor || null,
    bedrooms: unitData.bedrooms,
    bathrooms: unitData.bathrooms,
    sizeSqm: unitData.sizeSqm ? unitData.sizeSqm.toString() : null,
    baseRent: unitData.baseRent.toString(),
    status: unitData.status,
    isActive: unitData.isActive,
    metadata: unitData.metadata || {},
  };

  const result = await db.insert(units)
    .values(insertData)
    .returning();
  
  return result[0];
};

/**
 * Update an existing unit
 */
export const updateUnitServices = async (
  unitId: string,
  unitData: PartialUnitInput
): Promise<Unit> => {
  // Check if unit exists
  const unitExists = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    columns: { id: true, propertyId: true, code: true }
  });

  if (!unitExists) {
    throw new NotFoundError("Unit");
  }

  // If code is being updated, check if it's unique within the property
  if (unitData.code && unitData.code !== unitExists.code) {
    const existingUnit = await db.query.units.findFirst({
      where: and(
        eq(units.propertyId, unitExists.propertyId),
        eq(units.code, unitData.code)
      )
    });

    if (existingUnit) {
      throw new ConflictError("Unit with this code already exists in the property");
    }
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Only include fields that are provided
  if (unitData.code !== undefined) updateData.code = unitData.code;
  if (unitData.floor !== undefined) updateData.floor = unitData.floor || null;
  if (unitData.bedrooms !== undefined) updateData.bedrooms = unitData.bedrooms;
  if (unitData.bathrooms !== undefined) updateData.bathrooms = unitData.bathrooms;
  if (unitData.sizeSqm !== undefined) updateData.sizeSqm = unitData.sizeSqm || null;
  if (unitData.baseRent !== undefined) updateData.baseRent = unitData.baseRent;
  if (unitData.status !== undefined) updateData.status = unitData.status;
  if (unitData.isActive !== undefined) updateData.isActive = unitData.isActive;
  if (unitData.metadata !== undefined) updateData.metadata = unitData.metadata || {};

  const result = await db.update(units)
    .set(updateData)
    .where(eq(units.id, unitId))
    .returning();
  
  return result[0];
};

/**
 * Delete a unit (soft delete by setting isActive to false)
 */
export const deleteUnitServices = async (
  unitId: string
): Promise<Unit> => {
  // Check if unit exists
  const unitExists = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    columns: { id: true }
  });

  if (!unitExists) {
    throw new NotFoundError("Unit");
  }

  // Check if unit has active leases
  const activeLeases = await db.query.leases.findMany({
    where: and(
      eq(leases.unitId, unitId),
      inArray(leases.status, ["active", "pendingMoveIn"])
    ),
    columns: { id: true }
  });

  if (activeLeases.length > 0) {
    throw new ValidationError("Cannot delete unit with active leases");
  }

  const result = await db.update(units)
    .set({ 
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(units.id, unitId))
    .returning();
  
  return result[0];
};

/**
 * Get all amenities for a specific unit
 */
export const getUnitAmenitiesServices = async (
  unitId: string
): Promise<any[]> => {
  // Check if unit exists
  const unitExists = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    columns: { id: true }
  });

  if (!unitExists) {
    throw new NotFoundError("Unit");
  }

  return await db.query.unitAmenities.findMany({
    where: eq(unitAmenities.unitId, unitId),
    with: {
      amenity: {
        columns: {
          id: true,
          name: true,
          description: true,
        }
      }
    }
  });
};

/**
 * Add an amenity to a unit
 */
export const addUnitAmenityServices = async (
  unitId: string,
  amenityData: UnitAmenityInput
): Promise<any> => {
  // Check if unit exists
  const unitExists = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    columns: { id: true, propertyId: true }
  });

  if (!unitExists) {
    throw new NotFoundError("Unit");
  }

  // Check if amenity exists
  const amenityExists = await db.query.amenities.findFirst({
    where: eq(amenities.id, amenityData.amenityId),
    columns: { id: true, organizationId: true }
  });

  if (!amenityExists) {
    throw new NotFoundError("Amenity");
  }

  // Check if amenity belongs to the same organization as the unit's property
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, unitExists.propertyId),
    columns: { organizationId: true }
  });

  if (!property || property.organizationId !== amenityExists.organizationId) {
    throw new ValidationError("Amenity does not belong to the same organization as the unit's property");
  }

  // Check if amenity is already assigned to the unit
  const existingAssignment = await db.query.unitAmenities.findFirst({
    where: and(
      eq(unitAmenities.unitId, unitId),
      eq(unitAmenities.amenityId, amenityData.amenityId)
    )
  });

  if (existingAssignment) {
    throw new ConflictError("Amenity is already assigned to this unit");
  }

  const result = await db.insert(unitAmenities)
    .values({
      unitId,
      amenityId: amenityData.amenityId,
    })
    .returning();
  
  return result[0];
};

/**
 * Remove an amenity from a unit
 */
export const removeUnitAmenityServices = async (
  unitId: string,
  amenityId: string
): Promise<any> => {
  const result = await db.delete(unitAmenities)
    .where(and(
      eq(unitAmenities.unitId, unitId),
      eq(unitAmenities.amenityId, amenityId)
    ))
    .returning();
  
  if (result.length === 0) {
    throw new NotFoundError("Amenity assignment");
  }
  
  return result[0];
};

/**
 * Update unit status
 */
export const updateUnitStatusServices = async (
  unitId: string,
  status: UnitStatusEnum,
  statusData: UnitStatusChangeInput
): Promise<Unit> => {
  // Check if unit exists
  const unitExists = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    columns: { id: true }
  });

  if (!unitExists) {
    throw new NotFoundError("Unit");
  }

  const result = await db.update(units)
    .set({ 
      status,
      updatedAt: new Date(),
      metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
        statusChange: {
          reason: statusData.reason,
          notes: statusData.notes,
          changedAt: new Date().toISOString(),
        }
      })}`
    })
    .where(eq(units.id, unitId))
    .returning();
  
  return result[0];
};