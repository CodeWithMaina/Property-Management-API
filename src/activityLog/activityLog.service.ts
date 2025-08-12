import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
import db from '../drizzle/db';
import { ActivityLog, activityLogs } from '../drizzle/schema';
import { ActivityLogFilter, ActivityStats } from './activityLog.schema';

export const createActivityLog = async (logData: ActivityLog) => {
  try {
    const [log] = await db.insert(activityLogs).values(logData).returning();
    return log;
  } catch (error) {
    console.error('Failed to create activity log:', error);
    console.log('Activity Log Fallback:', logData);
  }
};

export const getActivityLogs = async (filters: ActivityLogFilter) => {
  const { userId, action, entityType, startDate, endDate, page = 1, limit = 20 } = filters;
  
  const whereConditions = [];
  if (userId) whereConditions.push(eq(activityLogs.userId, userId));
  if (action) whereConditions.push(eq(activityLogs.action, action));
  if (entityType) whereConditions.push(eq(activityLogs.entityType, entityType));
  if (startDate) whereConditions.push(gte(activityLogs.timestamp, startDate));
  if (endDate) whereConditions.push(lte(activityLogs.timestamp, endDate));
  
  const offset = (page - 1) * limit;
  
  return db
    .select()
    .from(activityLogs)
    .where(whereConditions.length ? and(...whereConditions) : undefined)
    .orderBy(sql`${activityLogs.timestamp} DESC`)
    .limit(limit)
    .offset(offset);
};

export const getActivityStats = async (): Promise<ActivityStats> => {
  const results = await db.select({
    totalActions: count(),
    topActions: sql<string>`${activityLogs.action} as action`,
    actionCount: sql<number>`count(${activityLogs.action})`
  })
  .from(activityLogs)
  .groupBy(activityLogs.action)
  .orderBy(sql`action_count DESC`)
  .limit(5);

  return {
    totalLogs: (await db.select({ count: count() }).from(activityLogs))[0].count,
    actionsBreakdown: results.map(r => ({
      action: r.topActions,
      count: r.actionCount
    })),
    // Add more stats as needed
  };
};