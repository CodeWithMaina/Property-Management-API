// auth.service.ts
import { eq } from "drizzle-orm";
import db from "../drizzle/db";
import { users, type NewUser, type User } from "../drizzle/schema";
import { TUserWithRelations } from "./auth.schema";

type QueryOptions = {
  with?: {
    properties?: boolean | { limit?: number;};
    leases?: boolean | { limit?: number;};
    activityLogs?: boolean | { limit?: number;};
  };
};

// Create a new user
export const createUserServices = async (user: NewUser): Promise<User> => {
  const [newUser] = await db.insert(users).values(user).returning();
  return newUser;
}

// Get user by email with optional relations
export const getUserByEmailService = async (
  email: string,
  options?: QueryOptions
): Promise<TUserWithRelations | undefined> => {
  const result = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: {
      properties: options?.with?.properties ? 
        (typeof options.with.properties === 'boolean' ? true : options.with.properties) : 
        undefined,
      leases: options?.with?.leases ? 
        (typeof options.with.leases === 'boolean' ? true : options.with.leases) : 
        undefined,
      activityLogs: options?.with?.activityLogs ? 
        (typeof options.with.activityLogs === 'boolean' ? true : options.with.activityLogs) : 
        undefined,
    }
  });
  
  return result as TUserWithRelations;
};

export const updateUserPasswordService = async (
  email: string, 
  newPassword: string
): Promise<User> => {
  const [updatedUser] = await db.update(users)
    .set({ 
      passwordHash: newPassword,
      updatedAt: new Date() 
    })
    .where(eq(users.email, email))
    .returning();

  if (!updatedUser) {
    throw new Error("User not found or password update failed");
  }
  
  return updatedUser;
}

// Get user by ID service
export const getUserByIdServices = async (id: string): Promise<User | undefined> => {
  const result = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  
  return result;
};