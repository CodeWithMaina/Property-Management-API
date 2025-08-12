import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { subscriptions } from "../drizzle/schema";
import { NewSubscription, Subscription } from "../drizzle/schema";
import { TSubscriptionUpdateSchema } from "./subscription.schema";

export const getSubscriptionsService = async (): Promise<Subscription[]> => {
  return await db.query.subscriptions.findMany();
};

export const getSubscriptionByIdService = async (
  subscriptionId: string
): Promise<Subscription | null> => {
  const result = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  });
  return result || null;
};

export const createSubscriptionService = async (
  subscriptionData: NewSubscription
): Promise<Subscription> => {
  const result = await db.insert(subscriptions).values(subscriptionData).returning();
  return result[0];
};

export const updateSubscriptionService = async (
  subscriptionId: string,
  subscriptionData: Partial<TSubscriptionUpdateSchema>
): Promise<Subscription | null> => {
  try {
    const result = await db
      .update(subscriptions)
      .set(subscriptionData)
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
};

export const deleteSubscriptionService = async (
  subscriptionId: string
): Promise<Subscription | null> => {
  const result = await db
    .delete(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return result[0] || null;
};