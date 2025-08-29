// import { activityLogService } from '../activityLog/activityLog.service';
// import { NewActivityLog } from '../drizzle/schema';

// /**
//  * Utility function to log activities consistently across the application
//  * @param logData - The activity data to log
//  * @returns Promise that resolves when the log is created
//  */
// export const logActivity = async (logData: Omit<NewActivityLog, 'ipAddress' | 'userAgent'> & {
//   ipAddress?: string;
//   userAgent?: string;
// }): Promise<void> => {
//   try {
//     await activityLogService.createActivityLog(logData);
//   } catch (error) {
//     // Silently fail for activity logging to not break main functionality
//     console.error('Activity logging failed:', error);
//   }
// };

// /**
//  * Helper to create activity log data with common patterns
//  */
// export const activityLogger = {
//   /**
//    * Log a create action
//    */
//   created: (entity: string, id: string, userId?: string, orgId?: string, description?: string) => {
//     return logActivity({
//       actorUserId: userId,
//       organizationId: orgId,
//       action: 'create',
//       targetTable: entity,
//       targetId: id,
//       description: description || `${entity} created`,
//     });
//   },

//   /**
//    * Log an update action
//    */
//   updated: (entity: string, id: string, userId?: string, orgId?: string, description?: string, changes?: Record<string, unknown>) => {
//     return logActivity({
//       actorUserId: userId,
//       organizationId: orgId,
//       action: 'update',
//       targetTable: entity,
//       targetId: id,
//       description: description || `${entity} updated`,
//       changes,
//     });
//   },

//   /**
//    * Log a delete action
//    */
//   deleted: (entity: string, id: string, userId?: string, orgId?: string, description?: string) => {
//     return logActivity({
//       actorUserId: userId,
//       organizationId: orgId,
//       action: 'delete',
//       targetTable: entity,
//       targetId: id,
//       description: description || `${entity} deleted`,
//     });
//   },

//   /**
//    * Log a status change action
//    */
//   statusChange: (entity: string, id: string, newStatus: string, userId?: string, orgId?: string, description?: string) => {
//     return logActivity({
//       actorUserId: userId,
//       organizationId: orgId,
//       action: 'statusChange',
//       targetTable: entity,
//       targetId: id,
//       description: description || `${entity} status changed to ${newStatus}`,
//     });
//   },
// };