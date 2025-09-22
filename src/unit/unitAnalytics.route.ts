import { Router } from "express";
import {
  getUnitAnalyticsOverview,
  getPropertyAnalytics,
  getOccupancyTrendAnalytics,
  getUnitDashboard
} from "./unitAnalytics.controller";

export const unitAnalyticsRouter = Router();

/**
 * @route GET /units/analytics/overview
 * @description Get overall unit statistics
 * @access Private
 */
unitAnalyticsRouter.get("/units/analytics/overview", getUnitAnalyticsOverview);

/**
 * @route GET /units/analytics/properties
 * @description Get statistics by property
 * @access Private
 */
unitAnalyticsRouter.get("/units/analytics/properties", getPropertyAnalytics);

/**
 * @route GET /units/analytics/occupancy-trend
 * @description Get occupancy trend over time
 * @access Private
 */
unitAnalyticsRouter.get("/units/analytics/occupancy-trend", getOccupancyTrendAnalytics);

/**
 * @route GET /units/analytics/dashboard
 * @description Get comprehensive dashboard data
 * @access Private
 */
unitAnalyticsRouter.get("/units/analytics/dashboard", getUnitDashboard);

export default unitAnalyticsRouter;