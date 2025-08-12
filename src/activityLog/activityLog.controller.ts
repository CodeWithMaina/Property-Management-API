import { Request, Response } from 'express';

import { createActivityLog, getActivityLogs, getActivityStats } from './activityLog.service';
import { ActivityLogFilter } from './activityLog.schema';

export const logActivity = async (req: Request, res: Response) => {
  try {
    const activity = await createActivityLog({
      ...req.body,
      userId: req.user?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
};

export const fetchActivityLogs = async (req: Request, res: Response) => {
  try {
    const filters: ActivityLogFilter = {
      userId: req.query.userId as string,
      action: req.query.action as string,
      entityType: req.query.entityType as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };
    
    const logs = await getActivityLogs(filters);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

export const fetchActivityStats = async (req: Request, res: Response) => {
  try {
    const stats = await getActivityStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity statistics' });
  }
};