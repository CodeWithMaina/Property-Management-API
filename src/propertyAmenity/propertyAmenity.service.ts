import db from "../drizzle/db";
import { eq, and } from "drizzle-orm";
import { propertyAmenities } from "../drizzle/schema";
import { NewPropertyAmenity, PropertyAmenity } from "../drizzle/schema";

export const getPropertyAmenitiesService = async (): Promise<PropertyAmenity[]> => {
  return await db.query.propertyAmenities.findMany();
};

export const getPropertyAmenityByIdService = async (
  propertyId: string,
  amenityId: string
): Promise<PropertyAmenity | null> => {
  const result = await db.query.propertyAmenities.findFirst({
    where: and(
      eq(propertyAmenities.propertyId, propertyId),
      eq(propertyAmenities.amenityId, amenityId)
    ),
  });
  return result || null;
};

export const createPropertyAmenityService = async (
  propertyAmenityData: NewPropertyAmenity
): Promise<PropertyAmenity> => {
  const result = await db.insert(propertyAmenities).values(propertyAmenityData).returning();
  return result[0];
};

export const deletePropertyAmenityService = async (
  propertyId: string,
  amenityId: string
): Promise<PropertyAmenity | null> => {
  const result = await db
    .delete(propertyAmenities)
    .where(
      and(
        eq(propertyAmenities.propertyId, propertyId),
        eq(propertyAmenities.amenityId, amenityId)
      )
    )
    .returning();

  return result[0] || null;
};