// activityLog.controller.ts
import { Request, Response } from "express";
import { ActivityLogService } from "./activityLog.service";
import { ActivityLogFilterSchema } from "./activityLog.validator";
import { NewActivityLog } from "../drizzle/schema";
import { AppError } from "../utils/errorHandler";
import {
  createActivityLogsResponse,
  createActivityLogResponse,
  createErrorResponse,
} from "../utils/apiResponse/apiResponse.helper";

/**
 * POST /activity-logs
 * Creates a new activity log entry with comprehensive validation
 */
export const createActivityLogHandler = async (req: Request, res: Response) => {
  try {
    const logData = req.body as NewActivityLog;

    if (!logData) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Activity log data is required",
            "VALIDATION_ERROR"
          )
        );
    }

    const log = await ActivityLogService.createActivityLog(logData);

    return res
      .status(201)
      .json(
        createActivityLogResponse(log, "Activity log created successfully")
      );
  } catch (error) {
    console.error("Failed to create activity log:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(
        createErrorResponse("Failed to create activity log", "INTERNAL_ERROR")
      );
  }
};

/**
 * POST /activity-logs/batch
 * Creates multiple activity logs with transaction support
 */
export const createBatchActivityLogsHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const logsData = req.body as NewActivityLog[];

    if (!Array.isArray(logsData) || logsData.length === 0) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Batch data must be a non-empty array",
            "VALIDATION_ERROR"
          )
        );
    }

    // Validate maximum batch size
    const MAX_BATCH_SIZE = 100;
    if (logsData.length > MAX_BATCH_SIZE) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            `Batch size cannot exceed ${MAX_BATCH_SIZE} items`,
            "VALIDATION_ERROR"
          )
        );
    }

    const result = await ActivityLogService.createBatchActivityLogs(logsData);

    return res.status(201).json({
      success: true,
      message: "Batch activity logs created successfully",
      data: {
        success: result.length,
        failed: logsData.length - result.length,
        logs: result,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to create batch activity logs:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(
        createErrorResponse(
          "Failed to create batch activity logs",
          "INTERNAL_ERROR"
        )
      );
  }
};

/**
 * GET /activity-logs
 * Retrieves all logs with optional filters from query params
 */
export const getAllActivityLogsHandler = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate and parse query parameters
    const validatedFilters = ActivityLogFilterSchema.safeParse(req.query);

    if (!validatedFilters.success) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Invalid query parameters",
            "VALIDATION_ERROR",
            validatedFilters.error.issues
          )
        );
    }

    const logs = await ActivityLogService.getActivityLogs(
      validatedFilters.data
    );

    return res.json(
      createActivityLogsResponse(
        logs.data,
        logs.pagination,
        "Activity logs retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching activity logs:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch activity logs", "INTERNAL_ERROR")
      );
  }
};

/**
 * GET /activity-logs/organization/:orgId
 * Get logs for a specific organization
 */
export const getOrganizationLogsHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res
        .status(400)
        .json(
          createErrorResponse("Organization ID is required", "VALIDATION_ERROR")
        );
    }

    const logs = await ActivityLogService.getActivityLogs({
      organizationId: orgId,
    });

    return res.json(
      createActivityLogsResponse(
        logs.data,
        logs.pagination,
        "Organization activity logs retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching organization logs:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(
        createErrorResponse(
          "Failed to fetch organization logs",
          "INTERNAL_ERROR"
        )
      );
  }
};

/**
 * GET /activity-logs/user/:userId
 * Get logs for a specific user
 */
export const getUserLogsHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json(createErrorResponse("User ID is required", "VALIDATION_ERROR"));
    }

    const logs = await ActivityLogService.getActivityLogs({
      actorUserId: userId,
    });

    return res.json(
      createActivityLogsResponse(
        logs.data,
        logs.pagination,
        "User activity logs retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching user logs:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(createErrorResponse("Failed to fetch user logs", "INTERNAL_ERROR"));
  }
};

/**
 * GET /activity-logs/target/:table/:id
 * Get logs for a specific target entity
 */
export const getTargetLogsHandler = async (req: Request, res: Response) => {
  try {
    const { table, id } = req.params;

    if (!table || !id) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            "Target table and ID are required",
            "VALIDATION_ERROR"
          )
        );
    }

    const logs = await ActivityLogService.getActivityLogs({
      targetTable: table,
      targetId: id,
    });

    return res.json(
      createActivityLogsResponse(
        logs.data,
        logs.pagination,
        "Target activity logs retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching target logs:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(
        createErrorResponse("Failed to fetch target logs", "INTERNAL_ERROR")
      );
  }
};

/**
 * GET /activity-logs/stats
 * Get activity statistics
 */
export const getActivityStatsHandler = async (req: Request, res: Response) => {
  try {
    const { organizationId, timeframe = "7d" } = req.query;

    const stats = await ActivityLogService.getActivityStats(
      organizationId as string,
      timeframe as string
    );

    return res.json({
      success: true,
      message: "Activity statistics retrieved successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching activity stats:", error);

    if (error instanceof AppError) {
      return res
        .status(error.statusCode)
        .json(createErrorResponse(error.message, error.name, error.details));
    }

    return res
      .status(500)
      .json(
        createErrorResponse(
          "Failed to fetch activity statistics",
          "INTERNAL_ERROR"
        )
      );
  }
};
