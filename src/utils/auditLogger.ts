// utils/auditLogger.ts
export interface AuditLogEntry {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class AuditLogger {
  async logAuthEvent(entry: AuditLogEntry): Promise<void> {
    try {
      console.log('AUTH AUDIT:', {
        userId: entry.userId,
        action: entry.action,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: entry.timestamp.toISOString(),
        metadata: entry.metadata
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    userId?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      console.log('SECURITY EVENT:', {
        ...event,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}