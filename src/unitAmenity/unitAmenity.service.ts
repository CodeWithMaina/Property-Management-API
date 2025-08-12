import db from "../drizzle/db";
import { eq, and } from "drizzle-orm";
import { unitAmenities } from "../drizzle/schema";
import { NewUnitAmenity, UnitAmenity } from "../drizzle/schema";

export const getUnitAmenitiesService = async (): Promise<UnitAmenity[]> => {
  return await db.query.unitAmenities.findMany();
};

export const getUnitAmenityByIdService = async (
  unitId: string,
  amenityId: string
): Promise<UnitAmenity | null> => {
  const result = await db.query.unitAmenities.findFirst({
    where: and(
      eq(unitAmenities.unitId, unitId),
      eq(unitAmenities.amenityId, amenityId)
    ),
  });
  return result || null;
};

export const createUnitAmenityService = async (
  unitAmenityData: NewUnitAmenity
): Promise<UnitAmenity> => {
  const result = await db.insert(unitAmenities).values(unitAmenityData).returning();
  return result[0];
};

export const deleteUnitAmenityService = async (
  unitId: string,
  amenityId: string
): Promise<UnitAmenity | null> => {
  const result = await db
    .delete(unitAmenities)
    .where(
      and(
        eq(unitAmenities.unitId, unitId),
        eq(unitAmenities.amenityId, amenityId)
      )
    )
    .returning();

  return result[0] || null;
};