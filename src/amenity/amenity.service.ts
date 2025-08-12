import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { amenities, Amenity, NewAmenity } from "../drizzle/schema";
import { TAmenityUpdateSchema } from "./amenity.schema";

export const getAmenitiesService = async (): Promise<Amenity[]> => {
  return await db.query.amenities.findMany();
};

export const getAmenityByIdService = async (
  amenityId: string
): Promise<Amenity | null> => {
  const result = await db.query.amenities.findFirst({
    where: eq(amenities.id, amenityId),
  });
  return result || null;
};

export const createAmenityService = async (
  amenityData: NewAmenity
): Promise<Amenity> => {
  const result = await db.insert(amenities).values(amenityData).returning();
  return result[0];
};

export const updateAmenityService = async (
  amenityId: string,
  amenityData: Partial<TAmenityUpdateSchema>
): Promise<Amenity | null> => {
  try {
    const result = await db
      .update(amenities)
      .set({
        ...amenityData,
        updatedAt: new Date(),
      })
      .where(eq(amenities.id, amenityId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
};

export const deleteAmenityService = async (
  amenityId: string
): Promise<Amenity | null> => {
  const result = await db
    .delete(amenities)
    .where(eq(amenities.id, amenityId))
    .returning();

  return result[0] || null;
};