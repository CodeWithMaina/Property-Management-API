// maintenance.service.ts
import { and, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import db from "../drizzle/db";
import {
  maintenanceRequests,
  maintenanceComments,
  maintenanceAttachments,
  users,
  properties,
  units,
  MaintenanceStatusEnum,
  PriorityEnum,
  MaintenanceRequest,
  MaintenanceComment,
  MaintenanceAttachment,
  userOrganizations,
} from "../drizzle/schema";
import {
  CreateMaintenanceRequestInput,
  UpdateMaintenanceRequestInput,
  MaintenanceRequestFilters,
  PaginatedMaintenanceRequests,
  MaintenanceRequestResponse,
  AddCommentInput,
  AddAttachmentInput,
  ChangeStatusInput,
  AssignRequestInput,
  AddEstimateInput,
} from "./maintenance.types";
import { createActivityLog } from "../activityLog/activityLog.service";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
  ValidationError,
  AuthorizationError,
} from "../utils/errorHandler";
import { ActivityAction } from "../activityLog/activity.helper";

/**
 * Get all maintenance requests with optional filtering and pagination
 */
export const getMaintenanceRequestsService = async (
  filters: MaintenanceRequestFilters,
  organizationId?: string
): Promise<PaginatedMaintenanceRequests> => {
  try {
    const {
      status,
      priority,
      propertyId,
      assignedToUserId,
      createdByUserId,
      search,
      page = 1,
      limit = 20,
    } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Organization filter
    if (organizationId) {
      conditions.push(eq(maintenanceRequests.organizationId, organizationId));
    }

    if (status) {
      conditions.push(eq(maintenanceRequests.status, status));
    }

    if (priority) {
      conditions.push(eq(maintenanceRequests.priority, priority));
    }

    if (propertyId) {
      conditions.push(eq(maintenanceRequests.propertyId, propertyId));
    }

    if (assignedToUserId) {
      conditions.push(
        eq(maintenanceRequests.assignedToUserId, assignedToUserId)
      );
    }

    if (createdByUserId) {
      conditions.push(eq(maintenanceRequests.createdByUserId, createdByUserId));
    }

    if (search) {
      const searchCondition = or(
        like(maintenanceRequests.title, `%${search}%`),
        like(maintenanceRequests.description, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await db
      .select({ count: count() })
      .from(maintenanceRequests)
      .where(whereCondition);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const data = await db.query.maintenanceRequests.findMany({
      where: whereCondition,
      with: {
        property: true,
        unit: true,
        createdBy: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignedTo: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        comments: {
          with: {
            author: {
              columns: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        },
        attachments: true,
      },
      orderBy: [desc(maintenanceRequests.createdAt)],
      limit: limit,
      offset: offset,
    });

    // Transform data to handle null values properly
    const transformedData = data.map(request => ({
      ...request,
      assignedTo: request.assignedTo || undefined,
      unit: request.unit || undefined 
    }));

    return {
      data: transformedData,
      pagination: {
        total,
        count: data.length,
        perPage: limit,
        currentPage: page,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Error fetching maintenance requests:", error);
    throw new DatabaseError("Failed to fetch maintenance requests");
  }
};

/**
 * Get maintenance request by ID with detailed information
 */
export const getMaintenanceRequestByIdService = async (
  requestId: string,
  organizationId?: string
): Promise<MaintenanceRequestResponse> => {
  try {
    const conditions = [eq(maintenanceRequests.id, requestId)];

    if (organizationId) {
      conditions.push(eq(maintenanceRequests.organizationId, organizationId));
    }

    const request = await db.query.maintenanceRequests.findFirst({
      where: and(...conditions),
      with: {
        createdBy: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignedTo: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        property: true,
        unit: true,
        comments: {
          with: {
            author: {
              columns: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: desc(maintenanceComments.createdAt),
        },
        attachments: {
          orderBy: desc(maintenanceAttachments.createdAt),
        },
      },
    });

    if (!request) {
      throw new NotFoundError("Maintenance request");
    }

    // Handle null values
    return {
      ...request,
      assignedTo: request.assignedTo || undefined,
      unit: request.unit || undefined, // Convert null to undefined
    };
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch maintenance request");
  }
};

/**
 * Create a new maintenance request
 */
export const createMaintenanceRequestService = async (
  requestData: CreateMaintenanceRequestInput,
  createdByUserId: string,
  organizationId: string
): Promise<MaintenanceRequestResponse> => {
  try {
    // Verify property exists and belongs to organization
    const property = await db.query.properties.findFirst({
      where: and(
        eq(properties.id, requestData.propertyId),
        eq(properties.organizationId, organizationId)
      ),
    });

    if (!property) {
      throw new NotFoundError("Property");
    }

    // Verify unit exists and belongs to property if provided
    if (requestData.unitId) {
      const unit = await db.query.units.findFirst({
        where: and(
          eq(units.id, requestData.unitId),
          eq(units.propertyId, requestData.propertyId)
        ),
      });

      if (!unit) {
        throw new ValidationError(
          "Unit not found or does not belong to the specified property"
        );
      }
    }

    const [newRequest] = await db
      .insert(maintenanceRequests)
      .values({
        ...requestData,
        organizationId,
        createdByUserId,
        status: "open" as MaintenanceStatusEnum,
      })
      .returning();

    // Fetch the complete request with relations
    const completeRequest = await getMaintenanceRequestByIdService(
      newRequest.id,
      organizationId
    );

    // Log activity
    await createActivityLog({
      actorUserId: createdByUserId,
      action: ActivityAction.create,
      targetTable: "maintenanceRequests",
      targetId: newRequest.id,
      description: `Maintenance request "${newRequest.title}" created`,
      changes: { created: newRequest },
      organizationId,
    });

    return completeRequest;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError)
      throw error;
    throw new DatabaseError("Failed to create maintenance request");
  }
};

/**
 * Update an existing maintenance request
 */
export const updateMaintenanceRequestService = async (
  requestId: string,
  requestData: UpdateMaintenanceRequestInput,
  actorUserId: string, // Added actorUserId
  organizationId: string // Added organizationId
): Promise<MaintenanceRequestResponse> => {
  try {
    const existingRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    const updateData: any = { ...requestData };
    if (requestData.costAmount !== undefined) {
      updateData.costAmount = requestData.costAmount.toString();
    }
    updateData.updatedAt = new Date();

    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set(updateData)
      .where(
        and(
          eq(maintenanceRequests.id, requestId),
          eq(maintenanceRequests.organizationId, organizationId)
        )
      )
      .returning();

    // Fetch the full updated request with relations
    const fullUpdatedRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Log activity
    await createActivityLog({
      actorUserId,
      action: ActivityAction.update,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Maintenance request "${fullUpdatedRequest.title}" updated`,
      changes: { before: existingRequest, after: fullUpdatedRequest },
      organizationId,
    });

    return fullUpdatedRequest;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to update maintenance request");
  }
};

/**
 * Assign a maintenance request to a staff member
 */
export const assignMaintenanceRequestService = async (
  requestId: string,
  assignData: AssignRequestInput,
  actorUserId: string,
  organizationId: string
): Promise<MaintenanceRequestResponse> => {
  try {
    const existingRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Verify the assigned user exists and belongs to the organization
    const assignedUser = await db.query.userOrganizations.findFirst({
      where: and(
        eq(userOrganizations.userId, assignData.assignedToUserId),
        eq(userOrganizations.organizationId, organizationId)
      ),
    });

    if (!assignedUser) {
      throw new ValidationError(
        "User not found or does not belong to this organization"
      );
    }

    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set({
        assignedToUserId: assignData.assignedToUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(maintenanceRequests.id, requestId),
          eq(maintenanceRequests.organizationId, organizationId)
        )
      )
      .returning();

    // Fetch the complete request with relations
    const completeRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Log activity - use the original request's assignedToUserId from the database result
    await createActivityLog({
      actorUserId,
      action: ActivityAction.assign,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Maintenance request "${updatedRequest.title}" assigned to user`,
      changes: {
        before: { assignedToUserId: existingRequest.assignedToUserId },
        after: { assignedToUserId: assignData.assignedToUserId },
      },
      organizationId,
    });

    return completeRequest;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError)
      throw error;
    throw new DatabaseError("Failed to assign maintenance request");
  }
};

/**
 * Unassign a maintenance request from the current staff member
 */
export const unassignMaintenanceRequestService = async (
  requestId: string,
  actorUserId: string,
  organizationId: string
): Promise<MaintenanceRequestResponse> => {
  try {
    const existingRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Check if the request is assigned to anyone
    if (!existingRequest.assignedTo) {
      throw new ValidationError("Request is not currently assigned to anyone");
    }

    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set({
        assignedToUserId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(maintenanceRequests.id, requestId),
          eq(maintenanceRequests.organizationId, organizationId)
        )
      )
      .returning();

    // Fetch the complete request with relations
    const completeRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Log activity
    await createActivityLog({
      actorUserId,
      action: ActivityAction.unassign,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Maintenance request "${updatedRequest.title}" unassigned`,
      changes: {
        before: { assignedToUserId: existingRequest.assignedTo?.id },
        after: { assignedToUserId: null },
      },
      organizationId,
    });

    return completeRequest;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError)
      throw error;
    throw new DatabaseError("Failed to unassign maintenance request");
  }
};

/**
 * Change the status of a maintenance request
 */
export const changeMaintenanceRequestStatusService = async (
  requestId: string,
  statusData: ChangeStatusInput,
  actorUserId: string,
  organizationId: string
): Promise<MaintenanceRequestResponse> => {
  try {
    const existingRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Validate status transition
    if (statusData.status === "resolved" || statusData.status === "closed") {
      if (
        !existingRequest.assignedToUserId &&
        existingRequest.status !== "resolved"
      ) {
        throw new ValidationError(
          "Cannot resolve or close an unassigned request"
        );
      }
    }

    const updateData: any = {
      status: statusData.status,
      updatedAt: new Date(),
    };

    // Set resolvedAt if status is being changed to resolved
    if (
      statusData.status === "resolved" &&
      existingRequest.status !== "resolved"
    ) {
      updateData.resolvedAt = new Date();
    }

    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set(updateData)
      .where(
        and(
          eq(maintenanceRequests.id, requestId),
          eq(maintenanceRequests.organizationId, organizationId)
        )
      )
      .returning();

    // Fetch the complete request with relations
    const completeRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Log activity
    await createActivityLog({
      actorUserId,
      action: ActivityAction.statusChange,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Maintenance request "${updatedRequest.title}" status changed to ${statusData.status}`,
      changes: {
        before: { status: existingRequest.status },
        after: { status: statusData.status },
      },
      organizationId,
    });

    return completeRequest;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError)
      throw error;
    throw new DatabaseError("Failed to change maintenance request status");
  }
};

/**
 * Close a maintenance request (transition from resolved to closed)
 */
export const closeMaintenanceRequestService = async (
  requestId: string,
  actorUserId: string,
  organizationId: string
): Promise<MaintenanceRequestResponse> => {
  try {
    const existingRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    if (existingRequest.status !== "resolved") {
      throw new ValidationError("Only resolved requests can be closed");
    }

    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set({
        status: "closed" as MaintenanceStatusEnum,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(maintenanceRequests.id, requestId),
          eq(maintenanceRequests.organizationId, organizationId)
        )
      )
      .returning();

    // Fetch the complete request with relations
    const completeRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Log activity
    await createActivityLog({
      actorUserId,
      action: ActivityAction.statusChange,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Maintenance request "${updatedRequest.title}" closed`,
      changes: {
        before: { status: existingRequest.status },
        after: { status: "closed" },
      },
      organizationId,
    });

    return completeRequest;
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError)
      throw error;
    throw new DatabaseError("Failed to close maintenance request");
  }
};

/**
 * Add a cost estimate to a maintenance request
 */
export const addMaintenanceRequestEstimateService = async (
  requestId: string,
  estimateData: AddEstimateInput,
  actorUserId: string,
  organizationId: string
): Promise<MaintenanceRequestResponse> => {
  try {
    const existingRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    const [updatedRequest] = await db
      .update(maintenanceRequests)
      .set({
        costAmount: estimateData.costAmount.toString(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(maintenanceRequests.id, requestId),
          eq(maintenanceRequests.organizationId, organizationId)
        )
      )
      .returning();

    // Fetch the complete request with relations
    const completeRequest = await getMaintenanceRequestByIdService(
      requestId,
      organizationId
    );

    // Log activity
    await createActivityLog({
      actorUserId,
      action: ActivityAction.update,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Cost estimate added to maintenance request "${updatedRequest.title}"`,
      changes: {
        before: { costAmount: existingRequest.costAmount },
        after: { costAmount: estimateData.costAmount.toString() },
      },
      organizationId,
    });

    return completeRequest;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to add cost estimate");
  }
};

/**
 * Add a comment to a maintenance request
 */
export const addMaintenanceRequestCommentService = async (
  requestId: string,
  commentData: AddCommentInput,
  authorUserId: string,
  organizationId: string
): Promise<MaintenanceComment> => {
  try {
    // Verify request exists and belongs to organization
    const request = await db.query.maintenanceRequests.findFirst({
      where: and(
        eq(maintenanceRequests.id, requestId),
        eq(maintenanceRequests.organizationId, organizationId)
      ),
    });

    if (!request) {
      throw new NotFoundError("Maintenance request");
    }

    const [newComment] = await db
      .insert(maintenanceComments)
      .values({
        maintenanceRequestId: requestId,
        authorUserId,
        body: commentData.body,
      })
      .returning();

    // Fetch the complete comment with author
    const completeComment = await db.query.maintenanceComments.findFirst({
      where: eq(maintenanceComments.id, newComment.id),
      with: {
        author: true,
      },
    });

    if (!completeComment) {
      throw new DatabaseError("Failed to fetch created comment");
    }

    // Log activity
    await createActivityLog({
      actorUserId: authorUserId,
      action: ActivityAction.comment,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Comment added to maintenance request "${request.title}"`,
      changes: { comment: commentData.body },
      organizationId,
    });

    return completeComment;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to add comment");
  }
};

/**
 * Add an attachment to a maintenance request
 */
export const addMaintenanceRequestAttachmentService = async (
  requestId: string,
  attachmentData: AddAttachmentInput,
  actorUserId: string,
  organizationId: string
): Promise<MaintenanceAttachment> => {
  try {
    // Verify request exists and belongs to organization
    const request = await db.query.maintenanceRequests.findFirst({
      where: and(
        eq(maintenanceRequests.id, requestId),
        eq(maintenanceRequests.organizationId, organizationId)
      ),
    });

    if (!request) {
      throw new NotFoundError("Maintenance request");
    }

    const [newAttachment] = await db
      .insert(maintenanceAttachments)
      .values({
        maintenanceRequestId: requestId,
        ...attachmentData,
      })
      .returning();

    // Log activity
    await createActivityLog({
      actorUserId,
      action: ActivityAction.update,
      targetTable: "maintenanceRequests",
      targetId: requestId,
      description: `Attachment added to maintenance request "${request.title}"`,
      changes: { attachment: attachmentData.fileName },
      organizationId,
    });

    return newAttachment;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to add attachment");
  }
};

/**
 * Get maintenance requests for a specific property
 */
export const getMaintenanceRequestsByPropertyService = async (
  propertyId: string,
  filters: Omit<MaintenanceRequestFilters, "propertyId">,
  organizationId?: string
): Promise<PaginatedMaintenanceRequests> => {
  try {
    // Verify property exists and belongs to organization if provided
    if (organizationId) {
      const property = await db.query.properties.findFirst({
        where: and(
          eq(properties.id, propertyId),
          eq(properties.organizationId, organizationId)
        ),
      });

      if (!property) {
        throw new NotFoundError("Property");
      }
    }

    return await getMaintenanceRequestsService(
      {
        ...filters,
        propertyId,
      },
      organizationId
    );
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError(
      "Failed to fetch maintenance requests for property"
    );
  }
};

/**
 * Get maintenance requests assigned to a specific user
 */
export const getMaintenanceRequestsByAssignedUserService = async (
  userId: string,
  filters: Omit<MaintenanceRequestFilters, "assignedToUserId">,
  organizationId?: string
): Promise<PaginatedMaintenanceRequests> => {
  try {
    // Verify user exists and belongs to organization if provided
    if (organizationId) {
      const userOrg = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.organizationId, organizationId)
        ),
      });

      if (!userOrg) {
        throw new NotFoundError("User not found in organization");
      }
    }

    return await getMaintenanceRequestsService(
      {
        ...filters,
        assignedToUserId: userId,
      },
      organizationId
    );
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch maintenance requests for user");
  }
};
