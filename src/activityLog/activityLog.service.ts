import { and, count, desc, eq, gte, lte, sql, like, or } from "drizzle-orm";
import db from "../drizzle/db";
import { ActivityLog, activityLogs, NewActivityLog } from "../drizzle/schema";
import {
  ActivityStats,
  PaginatedActivityLogs,
} from "./activityLog.types";
import { ActivityLogFilterInput } from "./activityLog.validator";

/**
 * Creates a new activity log entry in the database.
 */
export const createActivityLog = async (
  logData: NewActivityLog
): Promise<ActivityLog | null> => {
  try {
    const [log] = await db.insert(activityLogs).values(logData).returning();
    
    // Optional: Send critical actions to monitoring
    if (['delete', 'update', 'security_breach'].includes(logData.action)) {
      await sendToMonitoringService(log);
    }
    
    return log;
  } catch (error) {
    console.error("Failed to create activity log:", error);
    console.log("Activity Log Fallback:", logData);
    return null;
  }
};

/**
 * Batch create activity logs
 */
export const createBatchActivityLogs = async (
  logsData: NewActivityLog[]
): Promise<ActivityLog[]> => {
  try {
    return await db.insert(activityLogs).values(logsData).returning();
  } catch (error) {
    console.error("Failed to create batch activity logs:", error);
    throw new Error("Failed to create batch logs");
  }
};

/**
 * Retrieves paginated activity logs with enhanced search
 */
export const getActivityLogs = async (
  filters: ActivityLogFilterInput
): Promise<PaginatedActivityLogs> => {
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

  const whereConditions = [];
  if (organizationId) whereConditions.push(eq(activityLogs.organizationId, organizationId));
  if (actorUserId) whereConditions.push(eq(activityLogs.actorUserId, actorUserId));
  if (action) whereConditions.push(eq(activityLogs.action, action as any));
  if (targetTable) whereConditions.push(eq(activityLogs.targetTable, targetTable));
  if (targetId) whereConditions.push(eq(activityLogs.targetId, targetId));
  if (startDate) whereConditions.push(gte(activityLogs.createdAt, startDate));
  if (endDate) whereConditions.push(lte(activityLogs.createdAt, endDate));
  if (ipAddress) whereConditions.push(sql`metadata->>'ipAddress' = ${ipAddress}`);
  if (status) whereConditions.push(sql`metadata->>'status' = ${status}`);

  // Full-text search across multiple fields
  if (search) {
    const searchCondition = or(
      like(activityLogs.targetTable, `%${search}%`),
      like(activityLogs.targetId, `%${search}%`),
      sql`metadata::text ILIKE ${`%${search}%`}`
    );
    whereConditions.push(searchCondition);
  }

  const offset = (page - 1) * limit;

  const totalResult = await db
    .select({ count: count() })
    .from(activityLogs)
    .where(whereConditions.length ? and(...whereConditions) : undefined);

  const total = totalResult[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);

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
    },
  };
};

/**
 * Enhanced activity statistics with time series
 */
export const getActivityStats = async (
  organizationId?: string,
  timeframe: string = '7d'
): Promise<ActivityStats> => {
  const whereCondition = organizationId
    ? eq(activityLogs.organizationId, organizationId)
    : undefined;

  const totalResult = await db
    .select({ count: count() })
    .from(activityLogs)
    .where(whereCondition);

  const actionBreakdown = await db
    .select({
      action: activityLogs.action,
      count: count(),
    })
    .from(activityLogs)
    .where(whereCondition)
    .groupBy(activityLogs.action)
    .orderBy(sql`count DESC`);

  // Time series data for charts
  const timeSeries = await db
    .select({
      date: sql<string>`DATE(created_at)`,
      count: count(),
    })
    .from(activityLogs)
    .where(and(
      whereCondition,
      timeframe !== 'all' ? gte(activityLogs.createdAt, getDateFromTimeframe(timeframe)) : undefined
    ))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  const recentActivity = await db
    .select()
    .from(activityLogs)
    .where(whereCondition)
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  return {
    totalLogs: totalResult[0]?.count || 0,
    actionsBreakdown: actionBreakdown.map((item) => ({
      action: item.action,
      count: item.count,
    })),
    timeSeries: timeSeries.map((item) => ({
      date: item.date,
      count: Number(item.count),
    })),
    recentActivity,
  };
};

// Helper function for timeframe calculations
const getDateFromTimeframe = (timeframe: string): Date => {
  const now = new Date();
  switch (timeframe) {
    case '24h': return new Date(now.setDate(now.getDate() - 1));
    case '7d': return new Date(now.setDate(now.getDate() - 7));
    case '30d': return new Date(now.setDate(now.getDate() - 30));
    case '90d': return new Date(now.setDate(now.getDate() - 90));
    default: return new Date(0); // beginning of time
  }
};

// Mock monitoring service integration
const sendToMonitoringService = async (log: ActivityLog): Promise<void> => {
  // Integrate with your monitoring service (Sentry, Datadog, etc.)
  console.log('Monitoring critical action:', log.action, log.id);
};