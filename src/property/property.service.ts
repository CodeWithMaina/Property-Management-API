import { eq, and, desc, sql } from "drizzle-orm";
import { PropertyInput, PartialPropertyInput, PropertyQueryParams } from "./property.validator";
import { properties, Property } from "../drizzle/schema";
import db from "../drizzle/db";

/**
 * Service for property-related database operations
 */
export class PropertyService {
  /**
   * Get all properties with optional filtering and pagination
   */
  async getProperties(queryParams: PropertyQueryParams): Promise<{ properties: Property[]; total: number }> {
    const { organizationId, isActive, page, limit } = queryParams;
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    
    if (organizationId) {
      whereConditions.push(eq(properties.organizationId, organizationId));
    }
    
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
      console.error('Error in getProperties:', error);
      throw error;
    }
  }

  /**
   * Get property by ID with detailed information
   */
  async getPropertyById(propertyId: string): Promise<Property | undefined> {
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
  }

  /**
   * Create a new property
   */
  async createProperty(propertyData: PropertyInput): Promise<Property> {
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
  }

  /**
   * Update an existing property
   */
  async updateProperty(propertyId: string, propertyData: PartialPropertyInput): Promise<Property> {
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
  }

  /**
   * Delete a property with option for hard or soft delete
   * @param propertyId - The ID of the property to delete
   * @param hardDelete - If true, permanently removes the property from database
   * @returns The deleted property object (soft delete) or undefined (hard delete)
   */
  async deleteProperty(propertyId: string, hardDelete: boolean = false): Promise<Property | undefined> {
    if (hardDelete) {
      // Hard delete - permanently remove from database
      const result = await db.delete(properties)
        .where(eq(properties.id, propertyId))
        .returning();
      
      return result[0] || undefined;
    } else {
      // Soft delete - set isActive to false
      const result = await db.update(properties)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(properties.id, propertyId))
        .returning();
      
      return result[0];
    }
  }

  /**
   * Restore a soft-deleted property by setting isActive back to true
   * @param propertyId - The ID of the property to restore
   * @returns The restored property object
   */
  async restoreProperty(propertyId: string): Promise<Property> {
    const result = await db.update(properties)
      .set({ 
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, propertyId))
      .returning();
    
    return result[0];
  }
}

// Export singleton instance
export const propertyService = new PropertyService();