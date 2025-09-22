import { Request, Response } from "express";
import {
  getUnitStatistics,
  getPropertyStatistics,
  getOccupancyTrend,
} from "./unitAnalytics.service";
import { asyncHandler, ValidationError } from "../utils/errorHandler";
import { createSuccessResponse } from "../utils/apiResponse/apiResponse.helper";
import { AnalyticsFilters } from "./unit.types";

/**
 * @route GET /units/analytics/overview
 * @description Get overall unit statistics
 * @access Private
 */
export const getUnitAnalyticsOverview = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters: AnalyticsFilters = {
      organizationId: req.query.organizationId as string,
      propertyId: req.query.propertyId as string,
    };

    const stats = await getUnitStatistics(filters);

    const response = createSuccessResponse(
      stats,
      "Unit analytics retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /units/analytics/properties
 * @description Get statistics by property
 * @access Private
 */
export const getPropertyAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters: AnalyticsFilters = {
      organizationId: req.query.organizationId as string,
    };

    const stats = await getPropertyStatistics(filters);

    const response = createSuccessResponse(
      stats,
      "Property analytics retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /units/analytics/occupancy-trend
 * @description Get occupancy trend over time
 * @access Private
 */
export const getOccupancyTrendAnalytics = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters: AnalyticsFilters = {
      organizationId: req.query.organizationId as string,
      propertyId: req.query.propertyId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    };

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new ValidationError("Start date cannot be after end date");
    }

    const trend = await getOccupancyTrend(filters);

    const response = createSuccessResponse(
      trend,
      "Occupancy trend retrieved successfully"
    );

    res.status(200).json(response);
  }
);

/**
 * @route GET /units/analytics/dashboard
 * @description Get comprehensive dashboard data
 * @access Private
 */
export const getUnitDashboard = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const filters: AnalyticsFilters = {
      organizationId: req.query.organizationId as string,
      propertyId: req.query.propertyId as string,
    };

    const [overview, properties, trend] = await Promise.all([
      getUnitStatistics(filters),
      getPropertyStatistics(filters),
      getOccupancyTrend(filters)
    ]);

    const dashboardData = {
      overview,
      properties,
      trend,
      timestamp: new Date().toISOString()
    };

    const response = createSuccessResponse(
      dashboardData,
      "Unit dashboard data retrieved successfully"
    );

    res.status(200).json(response);
  }
);