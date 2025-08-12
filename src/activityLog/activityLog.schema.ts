export type ActivityLogFilter = {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

export type ActivityStats = {
  totalLogs: number;
  actionsBreakdown: {
    action: string;
    count: number;
  }[];
  // Can add more stats fields as needed
};