import db from "../drizzle/db";
import { desc, eq } from "drizzle-orm";
import { payments } from "../drizzle/schema";
import { Payment, NewPayment } from "../drizzle/schema";

export const getPaymentsService = async (): Promise<Payment[]> => {
  return await db.query.payments.findMany({
    orderBy: desc(payments.createdAt),
  });
};

export const getPaymentByIdService = async (id: string): Promise<Payment | null> => {
  const result = await db.query.payments.findFirst({
    where: eq(payments.id, id),
  });
  return result || null;
};

export const createPaymentService = async (
  paymentData: NewPayment
): Promise<Payment> => {
  const result = await db.insert(payments).values(paymentData).returning();
  return result[0];
};

export const updatePaymentService = async (
  id: string,
  paymentData: Partial<NewPayment>
): Promise<Payment | null> => {
  const result = await db
    .update(payments)
    .set(paymentData)
    .where(eq(payments.id, id))
    .returning();
  return result[0] || null;
};

export const deletePaymentService = async (id: string): Promise<Payment | null> => {
  const result = await db
    .delete(payments)
    .where(eq(payments.id, id))
    .returning();
  return result[0] || null;
};

export const getPaymentsByLeaseService = async (
  leaseId: string
): Promise<Payment[]> => {
  return await db.query.payments.findMany({
    where: eq(payments.leaseId, leaseId),
    orderBy: desc(payments.createdAt),
  });
};