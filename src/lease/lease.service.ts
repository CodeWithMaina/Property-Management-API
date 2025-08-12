import db from "../drizzle/db";
import { desc, eq } from "drizzle-orm";
import { leases } from "../drizzle/schema";
import { Lease, NewLease } from "../drizzle/schema";

export const getLeasesService = async (): Promise<Lease[]> => {
  return await db.query.leases.findMany({
    orderBy: desc(leases.createdAt),
  });
};

export const getLeaseByIdService = async (id: string): Promise<Lease | null> => {
  const result = await db.query.leases.findFirst({
    where: eq(leases.id, id),
  });
  return result || null;
};

export const createLeaseService = async (leaseData: NewLease): Promise<Lease> => {
  const result = await db.insert(leases).values(leaseData).returning();
  return result[0];
};

export const updateLeaseService = async (
  id: string,
  leaseData: Partial<NewLease>
): Promise<Lease | null> => {
  const result = await db
    .update(leases)
    .set({
      ...leaseData,
      updatedAt: new Date(),
    })
    .where(eq(leases.id, id))
    .returning();
  return result[0] || null;
};

export const deleteLeaseService = async (id: string): Promise<Lease | null> => {
  const result = await db
    .delete(leases)
    .where(eq(leases.id, id))
    .returning();
  return result[0] || null;
};

export const getLeasesByTenantService = async (
  tenantId: string
): Promise<Lease[]> => {
  return await db.query.leases.findMany({
    where: eq(leases.tenantId, tenantId),
    orderBy: desc(leases.createdAt),
  });
};

export const getLeasesByUnitService = async (
  unitId: string
): Promise<Lease[]> => {
  return await db.query.leases.findMany({
    where: eq(leases.unitId, unitId),
    orderBy: desc(leases.createdAt),
  });
};