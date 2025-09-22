import { eq, and, sql, count, sum, avg, desc, inArray } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  units, 
  properties, 
  UnitStatusEnum
} from "../drizzle/schema";
import { AnalyticsFilters, PropertyStats, TimeSeriesData, UnitStats } from "./unit.types";



export const getUnitStatistics = async (
  filters: AnalyticsFilters = {}
): Promise<UnitStats> => {
  const { organizationId, propertyId } = filters;
  
  // Build where conditions
  const whereConditions = [];
  
  if (propertyId) {
    whereConditions.push(eq(units.propertyId, propertyId));
  } else if (organizationId) {
    // Get all properties for the organization first
    const orgProperties = await db.select({ id: properties.id })
      .from(properties)
      .where(eq(properties.organizationId, organizationId));
    
    if (orgProperties.length === 0) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byStatus: { vacant: 0, occupied: 0, reserved: 0, unavailable: 0 },
        byBedrooms: {},
        byBathrooms: {},
        occupancyRate: 0,
        totalRevenuePotential: 0,
        averageRent: 0
      };
    }
    
    whereConditions.push(inArray(units.propertyId, orgProperties.map(p => p.id)));
  }
  
  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get basic counts
    const [totalResult, activeResult] = await Promise.all([
      db.select({ count: count() })
        .from(units)
        .where(whereClause),
      
      db.select({ count: count() })
        .from(units)
        .where(whereClause ? and(whereClause, eq(units.isActive, true)) : eq(units.isActive, true))
    ]);

    const total = totalResult[0]?.count || 0;
    const active = activeResult[0]?.count || 0;
    const inactive = total - active;

    // Get counts by status
    const statusResults = await db.select({ 
        status: units.status, 
        count: count() 
      })
      .from(units)
      .where(whereClause ? and(whereClause, eq(units.isActive, true)) : eq(units.isActive, true))
      .groupBy(units.status);

    const byStatus: Record<UnitStatusEnum, number> = {
      vacant: 0,
      occupied: 0,
      reserved: 0,
      unavailable: 0
    };

    statusResults.forEach(row => {
      byStatus[row.status as UnitStatusEnum] = Number(row.count);
    });

    // Get counts by bedrooms
    const bedroomResults = await db.select({ 
        bedrooms: units.bedrooms, 
        count: count() 
      })
      .from(units)
      .where(whereClause ? and(whereClause, eq(units.isActive, true)) : eq(units.isActive, true))
      .groupBy(units.bedrooms);

    const byBedrooms: Record<number, number> = {};
    bedroomResults.forEach(row => {
      byBedrooms[Number(row.bedrooms)] = Number(row.count);
    });

    // Get counts by bathrooms
    const bathroomResults = await db.select({ 
        bathrooms: units.bathrooms, 
        count: count() 
      })
      .from(units)
      .where(whereClause ? and(whereClause, eq(units.isActive, true)) : eq(units.isActive, true))
      .groupBy(units.bathrooms);

    const byBathrooms: Record<number, number> = {};
    bathroomResults.forEach(row => {
      byBathrooms[Number(row.bathrooms)] = Number(row.count);
    });

    // Calculate financial metrics
    const financialResults = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(${units.baseRent}), 0)`,
        avgRent: sql<number>`COALESCE(AVG(${units.baseRent}), 0)`
      })
      .from(units)
      .where(whereClause ? and(whereClause, eq(units.isActive, true)) : eq(units.isActive, true));

    const totalRevenuePotential = Number(financialResults[0]?.totalRevenue || 0);
    const averageRent = Number(financialResults[0]?.avgRent || 0);

    // Calculate occupancy rate
    const occupancyRate = total > 0 ? (byStatus.occupied / total) * 100 : 0;

    return {
      total,
      active,
      inactive,
      byStatus,
      byBedrooms,
      byBathrooms,
      occupancyRate,
      totalRevenuePotential,
      averageRent
    };
  } catch (error) {
    console.error("Error in getUnitStatistics:", error);
    throw error;
  }
};

export const getPropertyStatistics = async (
  filters: AnalyticsFilters = {}
): Promise<PropertyStats[]> => {
  const { organizationId } = filters;
  
  // Build where conditions
  const whereConditions = [];
  
  if (organizationId) {
    whereConditions.push(eq(properties.organizationId, organizationId));
  }
  
  const whereClause = whereConditions.length > 0 
    ? and(...whereConditions) 
    : undefined;

  try {
    // Get properties with their unit statistics
    const propertyStats = await db.select({
        propertyId: properties.id,
        propertyName: properties.name,
        unitCount: count(units.id),
        occupiedCount: sql<number>`SUM(CASE WHEN ${units.status} = 'occupied' THEN 1 ELSE 0 END)`,
        vacantCount: sql<number>`SUM(CASE WHEN ${units.status} = 'vacant' THEN 1 ELSE 0 END)`,
        revenuePotential: sql<number>`COALESCE(SUM(${units.baseRent}), 0)`
      })
      .from(properties)
      .leftJoin(units, eq(units.propertyId, properties.id))
      .where(whereClause)
      .groupBy(properties.id, properties.name)
      .orderBy(desc(count(units.id))); // Fixed orderBy syntax

    return propertyStats.map(stat => ({
      propertyId: stat.propertyId,
      propertyName: stat.propertyName,
      unitCount: Number(stat.unitCount),
      occupiedCount: Number(stat.occupiedCount),
      vacantCount: Number(stat.vacantCount),
      revenuePotential: Number(stat.revenuePotential),
      occupancyRate: Number(stat.unitCount) > 0 
        ? (Number(stat.occupiedCount) / Number(stat.unitCount)) * 100 
        : 0
    }));
  } catch (error) {
    console.error("Error in getPropertyStatistics:", error);
    throw error;
  }
};

export const getOccupancyTrend = async (
  filters: AnalyticsFilters = {}
): Promise<TimeSeriesData[]> => {
  try {
    const currentStats = await getUnitStatistics(filters);
    
    return [{
      date: new Date().toISOString().split('T')[0],
      occupied: currentStats.byStatus.occupied,
      vacant: currentStats.byStatus.vacant,
      reserved: currentStats.byStatus.reserved,
      unavailable: currentStats.byStatus.unavailable
    }];
  } catch (error) {
    console.error("Error in getOccupancyTrend:", error);
    throw error;
  }
};