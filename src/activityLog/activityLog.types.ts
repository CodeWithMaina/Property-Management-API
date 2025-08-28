import { activityActionEnum, ActivityLog } from "../drizzle/schema";
import { ActivityLogFilterInput } from "./activityLog.validator";

export interface PaginatedActivityLogs {
  data: ActivityLog[];
  pagination: {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface ActivityStats {
  totalLogs: number;
  actionsBreakdown: {
    action: typeof activityActionEnum.enumValues[number];
    count: number;
  }[];
  timeSeries: {
    date: string;
    count: number;
  }[];
  recentActivity: ActivityLog[];
}

export interface BatchCreateResult {
  success: number;
  failed: number;
  logs: ActivityLog[];
}

export interface ExportOptions {
  format: 'csv' | 'json';
  filters: ActivityLogFilterInput;
}