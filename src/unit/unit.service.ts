import db from "../drizzle/db";
import { desc, eq } from "drizzle-orm";
import { units } from "../drizzle/schema";
import { Unit, NewUnit } from "../drizzle/schema";

export const getUnitsService = async (): Promise<Unit[]> => {
  return await db.query.units.findMany({
    orderBy: desc(units.createdAt),
  });
};

export const getUnitByIdService = async (id: string): Promise<Unit | null> => {
  const result = await db.query.units.findFirst({
    where: eq(units.id, id),
  });
  return result || null;
};

export const createUnitService = async (unitData: NewUnit): Promise<Unit> => {
  const result = await db.insert(units).values(unitData).returning();
  return result[0];
};

export const updateUnitService = async (
  id: string,
  unitData: Partial<NewUnit>
): Promise<Unit | null> => {
  const result = await db
    .update(units)
    .set({
      ...unitData,
      updatedAt: new Date(),
    })
    .where(eq(units.id, id))
    .returning();
  return result[0] || null;
};

export const deleteUnitService = async (id: string): Promise<Unit | null> => {
  const result = await db
    .delete(units)
    .where(eq(units.id, id))
    .returning();
  return result[0] || null;
};

export const getUnitsByPropertyService = async (
  propertyId: string
): Promise<Unit[]> => {
  return await db.query.units.findMany({
    where: eq(units.propertyId, propertyId),
    orderBy: desc(units.createdAt),
  });
};