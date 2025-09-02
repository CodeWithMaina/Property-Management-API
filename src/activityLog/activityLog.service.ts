// activityLog.service.ts
import { and, count, desc, eq, gte, lte, sql, like, or } from "drizzle-orm";
import db from "../drizzle/db";
import { ActivityLog, activityLogs, NewActivityLog } from "../drizzle/schema";
import { ActivityStats, PaginatedActivityLogs } from "./activityLog.types";
import { ActivityLogFilterInput } from "./activityLog.validator";
import { AppError } from "../utils/errorHandler";
import { ActivityAction, ActivityActionType } from "./activity.helper";

/**
 * Service for activity log operations with enhanced error handling and validation
 */
export class ActivityLogService {
  /**
   * Creates a new activity log entry in the database with validation
   */
  static async createActivityLog(
    logData: NewActivityLog
  ): Promise<ActivityLog> {
    try {
      // Validate required fields
      if (
        !logData.organizationId ||
        !logData.actorUserId ||
        !logData.action ||
        !logData.targetTable ||
        !logData.targetId
      ) {
        throw new AppError("Missing required activity log fields", 400);
      }

      const [log] = await db.insert(activityLogs).values(logData).returning();

      if (!log) {
        throw new AppError("Failed to create activity log", 500);
      }

      // Send critical actions to monitoring
      await this.monitorCriticalAction(log);

      return log;
    } catch (error) {
      console.error("Failed to create activity log:", error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create activity log", 500, error);
    }
  }

  /**
   * Batch create activity logs with transaction support
   */
  static async createBatchActivityLogs(
    logsData: NewActivityLog[]
  ): Promise<ActivityLog[]> {
    try {
      if (!logsData.length) {
        throw new AppError("Empty batch data", 400);
      }

      // Validate each log entry
      logsData.forEach((logData, index) => {
        if (
          !logData.organizationId ||
          !logData.actorUserId ||
          !logData.action ||
          !logData.targetTable ||
          !logData.targetId
        ) {
          throw new AppError(
            `Missing required fields in log entry at index ${index}`,
            400
          );
        }
      });

      const logs = await db.insert(activityLogs).values(logsData).returning();

      // Monitor critical actions
      await Promise.all(logs.map((log) => this.monitorCriticalAction(log)));

      return logs;
    } catch (error) {
      console.error("Failed to create batch activity logs:", error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create batch activity logs", 500, error);
    }
  }

  /**
   * Retrieves paginated activity logs with enhanced search and filtering
   */
  static async getActivityLogs(
    filters: ActivityLogFilterInput
  ): Promise<PaginatedActivityLogs> {
    try {
      const {
        organizationId,
        actorUserId,
        action,
        targetTable,
        targetId,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        search,
        ipAddress,
        status,
      } = filters;

      // Validate pagination parameters
      if (page < 1) throw new AppError("Page must be at least 1", 400);
      if (limit < 1 || limit > 100)
        throw new AppError("Limit must be between 1 and 100", 400);

      const whereConditions = [];

      if (organizationId)
        whereConditions.push(eq(activityLogs.organizationId, organizationId));
      if (actorUserId)
        whereConditions.push(eq(activityLogs.actorUserId, actorUserId));
      if (action)
        whereConditions.push(
          eq(activityLogs.action, action as ActivityActionType)
        );
      if (targetTable)
        whereConditions.push(eq(activityLogs.targetTable, targetTable));
      if (targetId) whereConditions.push(eq(activityLogs.targetId, targetId));
      if (startDate)
        whereConditions.push(gte(activityLogs.createdAt, startDate));
      if (endDate) whereConditions.push(lte(activityLogs.createdAt, endDate));
      if (ipAddress)
        whereConditions.push(sql`metadata->>'ipAddress' = ${ipAddress}`);
      if (status) whereConditions.push(sql`metadata->>'status' = ${status}`);

      // Full-text search across multiple fields
      if (search) {
        const searchCondition = or(
          like(activityLogs.targetTable, `%${search}%`),
          like(activityLogs.targetId, `%${search}%`),
          like(activityLogs.description, `%${search}%`),
          sql`metadata::text ILIKE ${`%${search}%`}`
        );
        whereConditions.push(searchCondition);
      }

    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(whereConditions.length ? and(...whereConditions) : undefined);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    // Calculate hasNext and hasPrev
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data = await db
      .select()
      .from(activityLogs)
      .where(whereConditions.length ? and(...whereConditions) : undefined)
      .orderBy(desc(activityLogs.createdAt))
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
        hasNext,
        hasPrev,
      },
    };
    } catch (error) {
      console.error("Error fetching activity logs:", error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to fetch activity logs", 500, error);
    }
  }

  /**
   * Enhanced activity statistics with time series and comprehensive error handling
   */
  static async getActivityStats(
  organizationId?: string,
  timeframe: string = '7d'
): Promise<ActivityStats> {
  try {
    const whereCondition = organizationId
      ? eq(activityLogs.organizationId, organizationId)
      : undefined;

    const totalResult = await db
      .select({ count: count() })
      .from(activityLogs)
      .where(whereCondition);

    const totalLogs = totalResult[0]?.count || 0;

    const actionBreakdown = await db
      .select({
        action: activityLogs.action,
        count: count(),
      })
      .from(activityLogs)
      .where(whereCondition)
      .groupBy(activityLogs.action)
      .orderBy(sql`count DESC`);

    // Calculate percentages for each action
    const actionsBreakdownWithPercentage = actionBreakdown.map((item) => ({
      action: item.action as ActivityActionType,
      count: Number(item.count),
      percentage: totalLogs > 0 ? (Number(item.count) / totalLogs) * 100 : 0,
    }));

    // Time series data for charts
    const timeSeries = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        count: count(),
      })
      .from(activityLogs)
      .where(and(
        whereCondition,
        timeframe !== 'all' ? gte(activityLogs.createdAt, this.getDateFromTimeframe(timeframe)) : undefined
      ))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    const recentActivity = await db
      .select()
      .from(activityLogs)
      .where(whereCondition)
      .orderBy(desc(activityLogs.createdAt))
      .limit(10);

    // Calculate summary statistics
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayCount, weekCount, monthCount] = await Promise.all([
      db.select({ count: count() })
        .from(activityLogs)
        .where(and(
          whereCondition,
          gte(activityLogs.createdAt, todayStart)
        ))
        .then(res => res[0]?.count || 0),
      
      db.select({ count: count() })
        .from(activityLogs)
        .where(and(
          whereCondition,
          gte(activityLogs.createdAt, weekStart)
        ))
        .then(res => res[0]?.count || 0),
      
      db.select({ count: count() })
        .from(activityLogs)
        .where(and(
          whereCondition,
          gte(activityLogs.createdAt, monthStart)
        ))
        .then(res => res[0]?.count || 0),
    ]);

    return {
      totalLogs,
      actionsBreakdown: actionsBreakdownWithPercentage,
      timeSeries: timeSeries.map((item) => ({
        date: item.date,
        count: Number(item.count),
      })),
      recentActivity,
      summary: {
        today: Number(todayCount),
        thisWeek: Number(weekCount),
        thisMonth: Number(monthCount),
      },
    };
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    throw new AppError('Failed to fetch activity statistics', 500, error);
  }
}

  /**
   * Monitor critical actions for security and auditing
   */
  private static async monitorCriticalAction(log: ActivityLog): Promise<void> {
    const criticalActions: ActivityActionType[] = [
      ActivityAction.delete,
      ActivityAction.update,
      ActivityAction.statusChange,
      ActivityAction.voidInvoice,
    ];

    if (criticalActions.includes(log.action as ActivityActionType)) {
      await this.sendToMonitoringService(log);
    }
  }

  /**
   * Helper function for timeframe calculations
   */
  private static getDateFromTimeframe(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case "1h":
        return new Date(now.setHours(now.getHours() - 1));
      case "24h":
        return new Date(now.setDate(now.getDate() - 1));
      case "7d":
        return new Date(now.setDate(now.getDate() - 7));
      case "30d":
        return new Date(now.setDate(now.getDate() - 30));
      case "90d":
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(0); // beginning of time
    }
  }

  /**
   * Integration with monitoring service (Sentry, Datadog, etc.)
   */
  private static async sendToMonitoringService(
    log: ActivityLog
  ): Promise<void> {
    try {
      // Implement your monitoring service integration here
      console.log("Monitoring critical action:", {
        action: log.action,
        id: log.id,
        target: `${log.targetTable}:${log.targetId}`,
        actor: log.actorUserId,
        organization: log.organizationId,
        timestamp: log.createdAt,
      });

      // Example: Integrate with Sentry
      // Sentry.captureMessage(`Critical action: ${log.action}`, {
      //   level: 'warning',
      //   extra: log
      // });
    } catch (monitoringError) {
      console.error("Monitoring service failed:", monitoringError);
      // Don't throw here to avoid breaking the main functionality
    }
  }
}

// Legacy export functions for backward compatibility
export const createActivityLog =
  ActivityLogService.createActivityLog.bind(ActivityLogService);
export const createBatchActivityLogs =
  ActivityLogService.createBatchActivityLogs.bind(ActivityLogService);
export const getActivityLogs =
  ActivityLogService.getActivityLogs.bind(ActivityLogService);
export const getActivityStats =
  ActivityLogService.getActivityStats.bind(ActivityLogService);
