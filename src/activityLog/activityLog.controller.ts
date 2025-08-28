import { Request, Response } from "express";
import {
  createActivityLog,
  createBatchActivityLogs,
  getActivityLogs,
  getActivityStats,
} from "./activityLog.service";
import { ActivityLogFilterSchema } from "./activityLog.validator";
import { NewActivityLog } from "../drizzle/schema";

/**
 * POST /activity-logs
 * Creates a new activity log entry.
 */
export const createActivityLogHandler = async (req: Request, res: Response) => {
  try {
    const logData = req.body as NewActivityLog;
    const log = await createActivityLog(logData);
    if (!log) {
      return res.status(500).json({ error: "Failed to create activity log" });
    }
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: "Failed to create activity log" });
  }
};

/**
 * POST /activity-logs/batch
 * Creates multiple activity logs
 */
export const createBatchActivityLogsHandler = async (req: Request, res: Response) => {
  try {
    const logsData = req.body as NewActivityLog[];
    if (!Array.isArray(logsData) || logsData.length === 0) {
      throw new AppError("Invalid batch data", 400);
    }
    
    const logs = await createBatchActivityLogs(logsData);
    res.status(201).json({
      success: logs.length,
      failed: logsData.length - logs.length,
      logs
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ 
        error: error.message, 
        details: error.details 
      });
    }
    res.status(500).json({ error: "Failed to create batch activity logs" });
  }
};

/**
 * GET /activity-logs
 * Retrieves all logs with optional filters from query params.
 */
export const getAllActivityLogsHandler = async (req: Request, res: Response) => {
  try {
    // Validate and parse query parameters
    const validatedFilters = ActivityLogFilterSchema.safeParse(req.query);
    
    if (!validatedFilters.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validatedFilters.error.format()
      });
    }

    const logs = await getActivityLogs(validatedFilters.data);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
};

/**
 * GET /activity-logs/organization/:orgId
 */
export const getOrganizationLogsHandler = async (req: Request, res: Response) => {
  try {
    const logs = await getActivityLogs({ organizationId: req.params.orgId });
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed to fetch organization logs" });
  }
};

/**
 * GET /activity-logs/user/:userId
 */
export const getUserLogsHandler = async (req: Request, res: Response) => {
  try {
    const logs = await getActivityLogs({ actorUserId: req.params.userId });
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed to fetch user logs" });
  }
};

/**
 * GET /activity-logs/target/:table/:id
 */
export const getTargetLogsHandler = async (req: Request, res: Response) => {
  try {
    const logs = await getActivityLogs({
      targetTable: req.params.table,
      targetId: req.params.id,
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed to fetch target logs" });
  }
};

/**
 * GET /activity-logs/stats
 */
export const getActivityStatsHandler = async (req: Request, res: Response) => {
  try {
    const stats = await getActivityStats(req.query.organizationId as string);
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Failed to fetch activity stats" });
  }
};


/**
 * GET /activity-logs/export
 * Exports logs in CSV or JSON format
 */
// export const exportActivityLogsHandler = async (req: Request, res: Response) => {
//   try {
//     const { format = 'json', ...filters } = req.query;
//     const validatedFilters = ActivityLogFilterSchema.safeParse(filters);
    
//     if (!validatedFilters.success) {
//       throw new AppError("Invalid query parameters", 400, validatedFilters.error.format());
//     }

//     const result = await exportActivityLogs(validatedFilters.data, format as string);
    
//     if (format === 'csv') {
//       res.setHeader('Content-Type', 'text/csv');
//       res.setHeader('Content-Disposition', 'attachment; filename=activity-logs.csv');
//       return res.send(result);
//     }
    
//     res.json(result);
//   } catch (error) {
//     if (error instanceof AppError) {
//       return res.status(error.statusCode).json({ 
//         error: error.message, 
//         details: error.details 
//       });
//     }
//     res.status(500).json({ error: "Failed to export activity logs" });
//   }
// };


export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}