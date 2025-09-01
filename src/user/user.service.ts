// user.service.ts
import { and, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import db from "../drizzle/db";
import {
  users,
  userOrganizations,
  propertyManagers,
  organizations,
  userAuth,
  UserRoleEnum,
  User,
  UserOrganization,
} from "../drizzle/schema";
import {
  CreateUserInput,
  UpdateUserInput,
  UserFilters,
  PaginatedUsers,
  UserResponse,
  SearchUsersInput,
  InviteUserInput,
  AcceptInviteInput,
} from "./user.types";
import { createActivityLog } from "../activityLog/activityLog.service";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
  ValidationError,
} from "../utils/errorHandler";
import { ActivityAction } from "../activityLog/activity.helper";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

/**
 * Get all users with optional filtering and pagination
 */
export const getUsersService = async (
  filters: UserFilters
): Promise<PaginatedUsers> => {
  try {
    const { isActive, search, role, organizationId, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    let whereCondition = undefined;
    const conditions = [];

    if (isActive !== undefined) {
      conditions.push(eq(users.isActive, isActive));
    }

    if (search) {
      const searchCondition = or(
        like(users.fullName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(users.phone, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Handle role filtering with subquery
    if (role) {
      const usersWithRole = db
        .select({ userId: userOrganizations.userId })
        .from(userOrganizations)
        .where(eq(userOrganizations.role, role));
      
      conditions.push(inArray(users.id, usersWithRole));
    }

    // Handle organization filtering with subquery
    if (organizationId) {
      const usersInOrganization = db
        .select({ userId: userOrganizations.userId })
        .from(userOrganizations)
        .where(eq(userOrganizations.organizationId, organizationId));
      
      conditions.push(inArray(users.id, usersInOrganization));
    }

    // Only apply where condition if we have any filters
    if (conditions.length > 0) {
      whereCondition = and(...conditions);
    }

    const totalResult = await db
      .select({ count: count() })
      .from(users)
      .where(whereCondition);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const data = await db
      .select()
      .from(users)
      .where(whereCondition)
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
    console.error("Error fetching users:", error);
    throw new DatabaseError("Failed to fetch users");
  }
};

/**
 * Get user by ID with detailed information
 */
export const getUserByIdService = async (
  userId: string
): Promise<UserResponse> => {
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

/**
 * Get user by email
 */
export const getUserByEmailService = async (
  email: string
): Promise<UserResponse | null> => {
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

/**
 * Create a new user
 */
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

/**
 * Update an existing user
 */
export const updateUserService = async (
  userId: string,
  userData: UpdateUserInput,
  actorUserId?: string
): Promise<UserResponse> => {
  try {
    const existingUser = await getUserByIdService(userId);

    // If email is being updated, check if it's unique
    if (userData.email && userData.email !== existingUser.email) {
      const userWithEmail = await getUserByEmailService(userData.email);
      if (userWithEmail) {
        throw new ConflictError("User with this email already exists");
      }
    }

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
    if (error instanceof NotFoundError || error instanceof ConflictError)
      throw error;
    throw new DatabaseError("Failed to update user");
  }
};

/**
 * Delete a user
 */
export const deleteUserService = async (
  userId: string,
  actorUserId?: string
): Promise<void> => {
  try {
    const existingUser = await getUserByIdService(userId);

    // Check if user has active organization memberships
    const userOrgs = await db.query.userOrganizations.findMany({
      where: eq(userOrganizations.userId, userId),
    });

    if (userOrgs.length > 0) {
      throw new ValidationError(
        "Cannot delete user with active organization memberships"
      );
    }

    // Delete user auth records first (cascade should handle this, but being explicit)
    await db.delete(userAuth).where(eq(userAuth.userId, userId));

    // Delete the user
    await db.delete(users).where(eq(users.id, userId));

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.delete,
        targetTable: "users",
        targetId: userId,
        description: `User ${existingUser.fullName} deleted`,
        changes: { deleted: existingUser },
      });
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError)
      throw error;
    throw new DatabaseError("Failed to delete user");
  }
};

/**
 * Deactivate a user
 */
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

/**
 * Activate a user
 */
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

/**
 * Get organizations a user belongs to
 */
export const getUserOrganizationsService = async (
  userId: string
): Promise<UserOrganization[]> => {
  try {
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true },
    });

    if (!userExists) {
      throw new NotFoundError("User");
    }

    const userOrgs = await db.query.userOrganizations.findMany({
      where: eq(userOrganizations.userId, userId),
      with: {
        organization: true,
      },
    });

    return userOrgs;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch user organizations");
  }
};

/**
 * Search users by email or phone
 */
export const searchUsersService = async (
  searchParams: SearchUsersInput
): Promise<UserResponse[]> => {
  try {
    let { email, phone } = searchParams;

    // Decode URL encoded characters in phone
    if (phone) {
      phone = decodeURIComponent(phone);
    }

    if (!email && !phone) {
      throw new ValidationError("Email or phone is required for search");
    }

    const whereConditions = [];
    if (email) whereConditions.push(eq(users.email, email));
    if (phone) whereConditions.push(eq(users.phone, phone));

    const usersList = await db
      .select()
      .from(users)
      .where(and(...whereConditions))
      .orderBy(desc(users.createdAt));

    return usersList;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new DatabaseError("Failed to search users");
  }
};

/**
 * Invite a user to join an organization
 */
export const inviteUserService = async (
  inviteData: InviteUserInput,
  actorUserId?: string
): Promise<{ inviteToken: string; expiresAt: Date }> => {
  try {
    const { email, organizationId, role } = inviteData;

    const userRole = role as UserRoleEnum;

    // Check if organization exists
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!organization) {
      throw new NotFoundError("Organization");
    }

    // Check if user already exists
    const existingUser = await getUserByEmailService(email);
    if (existingUser) {
      // Check if user is already a member of the organization
      const existingMembership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, existingUser.id),
          eq(userOrganizations.organizationId, organizationId)
        ),
      });

      if (existingMembership) {
        throw new ConflictError(
          "User is already a member of this organization"
        );
      }

      // Add user to organization
      await db.insert(userOrganizations).values({
        userId: existingUser.id,
        organizationId,
        role: userRole,
        isPrimary: false,
        createdAt: new Date(),
      });

      // TODO: Send notification email to existing user

      return {
        inviteToken: "existing_user",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
    }

    // Generate invite token
    const inviteToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invite in database (you'll need to create an invites table)
    // For now, we'll just return the token
    // TODO: Implement proper invite storage and email sending

    // Log activity
    if (actorUserId) {
      await createActivityLog({
        actorUserId,
        action: ActivityAction.create,
        targetTable: "invites",
        targetId: inviteToken,
        description: `Invited ${email} to join ${organization.name}`,
        changes: { email, organizationId, role },
      });
    }

    // TODO: Send invitation email with token

    return {
      inviteToken,
      expiresAt,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ConflictError)
      throw error;
    throw new DatabaseError("Failed to invite user");
  }
};

/**
 * Accept an invitation and create user account
 */
export const acceptInviteService = async (
  token: string,
  userData: AcceptInviteInput
): Promise<UserResponse> => {
  try {
    // TODO: Validate token and get invitation details from database
    // For now, we'll just create the user

    // Check if user already exists
    const existingUser = await getUserByEmailService(userData.email);
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        isActive: true,
      })
      .returning();

    // Create user auth record
    const passwordHash = await bcrypt.hash(userData.password, 12);
    await db.insert(userAuth).values({
      userId: newUser.id,
      email: userData.email,
      passwordHash,
      isEmailVerified: true,
    });

    // TODO: Add user to organization based on invitation
    // For now, we'll just return the user

    return newUser;
  } catch (error) {
    if (error instanceof ConflictError) throw error;
    throw new DatabaseError("Failed to accept invitation");
  }
};
