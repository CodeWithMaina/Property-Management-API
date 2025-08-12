import db from "../drizzle/db";
import { eq } from "drizzle-orm";
import { users, type User, type NewUser } from "../drizzle/schema";
import { TUserUpdateSchema } from "./user.schema";

export const getUsersService = async (): Promise<User[]> => {
  return await db.query.users.findMany({
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  });
};

export const getUserByIdService = async (userId: string): Promise<User | null> => {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return result || null;
};

export const createUserService = async (userData: NewUser): Promise<User> => {
  const result = await db.insert(users).values(userData).returning();
  return result[0];
};

export const updateUserService = async (
  userId: string,
  userData: Partial<TUserUpdateSchema>
): Promise<User | null> => {
  try {
    const result = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Database update error:", error);
    throw error;
  }
};

export const deleteUserService = async (userId: string): Promise<User | null> => {
  const result = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning();

  return result[0] || null;
};