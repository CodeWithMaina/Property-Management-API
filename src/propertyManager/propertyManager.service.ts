import { eq, and } from "drizzle-orm";
import db from "../drizzle/db";
import { PropertyManagerInput } from "./propertyManager.validator";
import { properties, propertyManagers, PropertyManager, users } from "../drizzle/schema";

/**
 * Service for property manager-related database operations
 */
export class PropertyManagerService {
  /**
   * Get all managers for a specific property
   */
  async getPropertyManagers(propertyId: string): Promise<PropertyManager[]> {
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
  }

  /**
   * Assign a manager to a property
   */
  async assignPropertyManager(
    propertyId: string,
    managerData: PropertyManagerInput
  ): Promise<PropertyManager> {
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
  }

  /**
   * Remove a manager from a property
   */
  async removePropertyManager(
    propertyId: string,
    userId: string
  ): Promise<PropertyManager> {
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
  }
}

// Export singleton instance
export const propertyManagerService = new PropertyManagerService();