import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { billingPlans } from "../drizzle/schema";
import { NewBillingPlan, BillingPlan } from "../drizzle/schema";
import { TBillingPlanUpdateSchema } from "./billingPlan.schema";

export const getBillingPlansService = async (): Promise<BillingPlan[]> => {
  return await db.query.billingPlans.findMany();
};

export const getBillingPlanByIdService = async (
  billingPlanId: string
): Promise<BillingPlan | null> => {
  const result = await db.query.billingPlans.findFirst({
    where: eq(billingPlans.id, billingPlanId),
  });
  return result || null;
};

export const createBillingPlanService = async (
  billingPlanData: NewBillingPlan
): Promise<BillingPlan> => {
  const result = await db.insert(billingPlans).values(billingPlanData).returning();
  return result[0];
};

export const updateBillingPlanService = async (
  billingPlanId: string,
  billingPlanData: Partial<TBillingPlanUpdateSchema>
): Promise<BillingPlan | null> => {
  try {
    const result = await db
      .update(billingPlans)
      .set({
        ...billingPlanData,
        updatedAt: new Date(),
      })
      .where(eq(billingPlans.id, billingPlanId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
};

export const deleteBillingPlanService = async (
  billingPlanId: string
): Promise<BillingPlan | null> => {
  const result = await db
    .delete(billingPlans)
    .where(eq(billingPlans.id, billingPlanId))
    .returning();

  return result[0] || null;
};