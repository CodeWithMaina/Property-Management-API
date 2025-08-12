import db from "../drizzle/db";
import { desc, eq } from "drizzle-orm";
import { properties } from "../drizzle/schema";
import { Property, NewProperty } from "../drizzle/schema";

export const getPropertiesService = async (): Promise<Property[]> => {
  return await db.query.properties.findMany({
    orderBy: desc(properties.createdAt),
  });
};

export const getPropertyByIdService = async (
  id: string
): Promise<Property | null> => {
  const result = await db.query.properties.findFirst({
    where: eq(properties.id, id),
  });
  return result || null;
};

export const createPropertyService = async (
  propertyData: NewProperty
): Promise<Property> => {
  const result = await db.insert(properties).values(propertyData).returning();
  return result[0];
};

export const updatePropertyService = async (
  id: string,
  propertyData: Partial<NewProperty>
): Promise<Property | null> => {
  const result = await db
    .update(properties)
    .set({
      ...propertyData,
      updatedAt: new Date(),
    })
    .where(eq(properties.id, id))
    .returning();

  return result[0] || null;
};

export const deletePropertyService = async (
  id: string
): Promise<Property | null> => {
  const result = await db
    .delete(properties)
    .where(eq(properties.id, id))
    .returning();

  return result[0] || null;
};