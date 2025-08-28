import { and, count, desc, eq, like, or } from "drizzle-orm";
import db from "../drizzle/db";
import { users, userOrganizations, propertyManagers } from "../drizzle/schema";
import {
  CreateUserInput,
  UpdateUserInput,
  UserFilters,
  PaginatedUsers,
  UserResponse,
} from "./user.types";
import { createActivityLog } from "../activityLog/activityLog.service";
import { NotFoundError, ConflictError, DatabaseError } from "../utils/errorHandler";
import { ActivityAction } from "../activityLog/activity.helper";

export const getUsersService = async (filters: UserFilters = {}): Promise<PaginatedUsers> => {
  try {
    const { isActive, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const whereConditions = [];
    if (isActive !== undefined) whereConditions.push(eq(users.isActive, isActive));
    
    if (search) {
      const searchCondition = or(
        like(users.fullName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.phone, `%${search}%`)
      );
      whereConditions.push(searchCondition);
    }

    const totalResult = await db
      .select({ count: count() })
      .from(users)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const data = await db
      .select()
      .from(users)
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        total,
        count: data.length,
        perPage: limit,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    throw new DatabaseError("Failed to fetch users");
  }
};

export const getUserByIdService = async (userId: string): Promise<UserResponse> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userOrganizations: {
          with: {
            organization: true,
          },
        },
        propertyManagers: {
          with: {
            property: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    return user;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch user");
  }
};

export const getUserByEmailService = async (email: string): Promise<UserResponse | null> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        userOrganizations: {
          with: {
            organization: true,
          },
        },
        propertyManagers: {
          with: {
            property: true,
          },
        },
      },
    });

    return user || null;
  } catch (error) {
    throw new DatabaseError("Failed to fetch user by email");
  }
};

export const createUserService = async (
  userData: CreateUserInput,
  actorUserId?: string
): Promise<UserResponse> => {
  try {
    // Check if email already exists
    const existingUser = await getUserByEmailService(userData.email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    const [newUser] = await db.insert(users).values(userData).returning();

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.create,
        targetTable: "users",
        targetId: newUser.id,
        description: `User ${newUser.fullName} created`,
        changes: { created: newUser },
      });
    }

    return newUser;
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    throw new DatabaseError("Failed to create user");
  }
};

export const updateUserService = async (
  userId: string,
  userData: UpdateUserInput,
  actorUserId?: string
): Promise<UserResponse> => {
  try {
    const existingUser = await getUserByIdService(userId);
    
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.update,
        targetTable: "users",
        targetId: userId,
        description: `User ${updatedUser.fullName} updated`,
        changes: { before: existingUser, after: updatedUser },
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to update user");
  }
};

export const deleteUserService = async (
  userId: string,
  actorUserId?: string
): Promise<UserResponse> => {
  try {
    const existingUser = await getUserByIdService(userId);

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.delete,
        targetTable: "users",
        targetId: userId,
        description: `User ${deletedUser.fullName} deleted`,
        changes: { deleted: deletedUser },
      });
    }

    return deletedUser;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to delete user");
  }
};

export const deactivateUserService = async (
  userId: string,
  actorUserId?: string
): Promise<UserResponse> => {
  try {
    const existingUser = await getUserByIdService(userId);

    const [updatedUser] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.update,
        targetTable: "users",
        targetId: userId,
        description: `User ${updatedUser.fullName} deactivated`,
        changes: { before: existingUser, after: updatedUser },
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to deactivate user");
  }
};

export const activateUserService = async (
  userId: string,
  actorUserId?: string
): Promise<UserResponse> => {
  try {
    const existingUser = await getUserByIdService(userId);

    const [updatedUser] = await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.update,
        targetTable: "users",
        targetId: userId,
        description: `User ${updatedUser.fullName} activated`,
        changes: { before: existingUser, after: updatedUser },
      });
    }

    return updatedUser;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to activate user");
  }
};