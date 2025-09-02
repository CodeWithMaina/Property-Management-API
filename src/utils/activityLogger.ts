// activityLogger.ts
import { ActivityAction, TargetTableType } from '../activityLog/activity.helper';
import { createActivityLog, createBatchActivityLogs } from '../activityLog/activityLog.service';
import { NewActivityLog } from '../drizzle/schema';
import { AppError } from '../utils/errorHandler';

export interface ActivityLogData extends Omit<NewActivityLog, 'ipAddress' | 'userAgent' | 'createdAt'> {
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, unknown>;
  description?: string;
}

export interface BatchActivityLogData extends ActivityLogData {
  timestamp?: Date;
}

/**
 * Utility class for consistent activity logging across the application
 */
export class ActivityLogger {
  /**
   * Log a single activity
   * @param logData - The activity data to log
   * @returns Promise that resolves to the created log or null if failed
   */
  static async logActivity(logData: ActivityLogData): Promise<NewActivityLog | null> {
    try {
      const validatedData: NewActivityLog = {
        ...logData,
        ipAddress: logData.ipAddress || null,
        userAgent: logData.userAgent || null,
        changes: logData.changes ? JSON.stringify(logData.changes) : null,
      };

      const log = await createActivityLog(validatedData);
      
      if (!log) {
        console.warn('Activity logging failed silently for:', logData);
        return null;
      }

      return log;
    } catch (error) {
      // Silently fail for activity logging to not break main functionality
      console.error('Activity logging failed:', error, logData);
      return null;
    }
  }

  /**
   * Log multiple activities in batch
   * @param logsData - Array of activity data to log
   * @returns Promise that resolves to batch creation result
   */
  static async logBatchActivities(logsData: BatchActivityLogData[]): Promise<{
    success: number;
    failed: number;
    logs: NewActivityLog[];
  }> {
    try {
      if (!logsData.length) {
        throw new AppError('Empty batch data', 400);
      }

      const validatedData: NewActivityLog[] = logsData.map(logData => ({
        ...logData,
        ipAddress: logData.ipAddress || null,
        userAgent: logData.userAgent || null,
        changes: logData.changes ? JSON.stringify(logData.changes) : null,
        createdAt: logData.timestamp || new Date(),
      }));

      const result = await createBatchActivityLogs(validatedData);
      return {
        success: result.length,
        failed: logsData.length - result.length,
        logs: result,
      };
    } catch (error) {
      console.error('Batch activity logging failed:', error);
      throw new AppError('Failed to create batch activity logs', 500);
    }
  }

  /**
   * Log a create action
   */
  static created(
    entity: TargetTableType,
    id: string,
    options: {
      userId?: string;
      orgId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<NewActivityLog | null> {
    return this.logActivity({
      actorUserId: options.userId,
      organizationId: options.orgId,
      action: ActivityAction.create,
      targetTable: entity,
      targetId: id,
      description: options.description || `${entity} created`,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  }

  /**
   * Log an update action
   */
  static updated(
    entity: TargetTableType,
    id: string,
    changes: Record<string, unknown>,
    options: {
      userId?: string;
      orgId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<NewActivityLog | null> {
    return this.logActivity({
      actorUserId: options.userId,
      organizationId: options.orgId,
      action: ActivityAction.update,
      targetTable: entity,
      targetId: id,
      description: options.description || `${entity} updated`,
      changes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  }

  /**
   * Log a delete action
   */
  static deleted(
    entity: TargetTableType,
    id: string,
    options: {
      userId?: string;
      orgId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<NewActivityLog | null> {
    return this.logActivity({
      actorUserId: options.userId,
      organizationId: options.orgId,
      action: ActivityAction.delete,
      targetTable: entity,
      targetId: id,
      description: options.description || `${entity} deleted`,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  }

  /**
   * Log a status change action
   */
  static statusChange(
    entity: TargetTableType,
    id: string,
    newStatus: string,
    options: {
      userId?: string;
      orgId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<NewActivityLog | null> {
    return this.logActivity({
      actorUserId: options.userId,
      organizationId: options.orgId,
      action: ActivityAction.statusChange,
      targetTable: entity,
      targetId: id,
      description: options.description || `${entity} status changed to ${newStatus}`,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  }

  /**
   * Log an assignment action
   */
  static assigned(
    entity: TargetTableType,
    id: string,
    assigneeId: string,
    options: {
      userId?: string;
      orgId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<NewActivityLog | null> {
    return this.logActivity({
      actorUserId: options.userId,
      organizationId: options.orgId,
      action: ActivityAction.assign,
      targetTable: entity,
      targetId: id,
      description: options.description || `${entity} assigned to user ${assigneeId}`,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  }

  /**
   * Log a payment action
   */
  static payment(
    entity: TargetTableType,
    id: string,
    amount: number,
    currency: string,
    options: {
      userId?: string;
      orgId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<NewActivityLog | null> {
    return this.logActivity({
      actorUserId: options.userId,
      organizationId: options.orgId,
      action: ActivityAction.payment,
      targetTable: entity,
      targetId: id,
      description: options.description || `Payment of ${amount} ${currency} processed for ${entity}`,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      metadata: options.metadata,
    });
  }
}

/**
 * Default export for convenience
 */
export default ActivityLogger;