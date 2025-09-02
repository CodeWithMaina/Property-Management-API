// activityLog.types.ts
import { activityActionEnum, ActivityLog } from "../drizzle/schema";
import { ActivityLogFilterInput } from "./activityLog.validator";
import { ActivityActionType } from "./activity.helper";

export interface PaginatedActivityLogs {
  data: ActivityLog[];
  pagination: {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ActivityStats {
  totalLogs: number;
  actionsBreakdown: {
    action: ActivityActionType;
    count: number;
    percentage: number;
  }[];
  timeSeries: {
    date: string;
    count: number;
  }[];
  recentActivity: ActivityLog[];
  summary: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export interface BatchCreateResult {
  success: number;
  failed: number;
  logs: ActivityLog[];
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  filters: ActivityLogFilterInput;
  columns?: string[];
}

export interface ActivityLogSearchResult {
  logs: ActivityLog[];
  total: number;
  facets: {
    actions: Record<string, number>;
    targetTables: Record<string, number>;
    users: Record<string, number>;
  };
}

export interface ActivityMonitoringAlert {
  type: 'critical' | 'warning' | 'info';
  action: ActivityActionType;
  target: string;
  actor: string;
  timestamp: Date;
  details: Record<string, unknown>;
}