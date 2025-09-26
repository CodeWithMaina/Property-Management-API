// middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import {
  AuthorizationRequest,
  AuthorizationOptions,
  ResourceContext,
} from './authorization.types';
import { leases, maintenanceRequests, organizations, properties, units, UserRoleEnum, users } from '../../drizzle/schema';
import { createErrorResponse } from '../../utils/apiResponse/apiResponse.helper';
import db from '../../drizzle/db';

/**
 * Main authorization middleware with enhanced resource-based access control
 */
export const authorize = (options: AuthorizationOptions = {}) => {
  return async (req: AuthorizationRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json(
          createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
        );
      }

      // 1. Check global role permissions
      if (options.allowedRoles && await checkGlobalRoles(user, options.allowedRoles)) {
        return next();
      }

      // 2. Check custom authorization function
      if (options.customCheck && await options.customCheck(req)) {
        return next();
      }

      // 3. Check resource-specific permissions
      if (options.resourceType && await checkResourceAccess(req, options)) {
        return next();
      }

      // 4. Check permission-based access
      if (options.requiredPermissions && await checkPermissions(user, options.requiredPermissions)) {
        return next();
      }

      return res.status(403).json(
        createErrorResponse("Insufficient permissions", "AUTHORIZATION_ERROR")
      );
      
    } catch (error) {
      console.error("Authorization error:", error);
      return res.status(500).json(
        createErrorResponse("Authorization check failed", "AUTHORIZATION_ERROR")
      );
    }
  };
};

/**
 * Check if user has global role permissions
 */
const checkGlobalRoles = async (
  user: AuthorizationRequest['user'],
  allowedRoles: UserRoleEnum[]
): Promise<boolean> => {
  if (!user || allowedRoles.length === 0) return false;

  // Check organization roles
  const hasOrgRole = user.organizations.some(org => 
    allowedRoles.includes(org.role)
  );

  // Check property management roles
  const hasPropertyRole = user.managedProperties.some(property => 
    allowedRoles.includes(property.role)
  );

  return hasOrgRole || hasPropertyRole;
};

/**
 * Check resource-specific access permissions
 */
const checkResourceAccess = async (
  req: AuthorizationRequest,
  options: AuthorizationOptions
): Promise<boolean> => {
  const user = req.user!;
  const resourceId = getResourceIdFromRequest(req, options.resourceType!);
  
  if (!resourceId) return false;

  // Get resource context (organization, property, owner info)
  const context = await getResourceContext(options.resourceType!, resourceId);
  if (!context) return false;

  const checks: Promise<boolean>[] = [];

  // Check ownership
  if (options.allowOwner && context.ownerId) {
    checks.push(Promise.resolve(context.ownerId === user.userId));
  }

  // Check property management
  if (options.allowPropertyManager && context.propertyId) {
    checks.push(Promise.resolve(
      user.managedProperties.some(pm => pm.propertyId === context.propertyId)
    ));
  }

  // Check same organization
  if (options.allowSameOrganization && context.organizationId) {
    checks.push(Promise.resolve(
      user.organizations.some(org => org.organizationId === context.organizationId)
    ));
  }

  const results = await Promise.all(checks);
  return results.some(result => result);
};

/**
 * Check specific permissions from user's role permissions
 */
const checkPermissions = async (
  user: AuthorizationRequest['user'],
  requiredPermissions: string[]
): Promise<boolean> => {
  if (!user) return false;

  // Check permissions from all organizations and properties
  const allPermissions = new Set<string>();

  // Add organization permissions
  user.organizations.forEach(org => {
    Object.keys(org.permissions || {}).forEach(permission => {
      if ((org.permissions as any)[permission] === true) {
        allPermissions.add(permission);
      }
    });
  });

  // Add property management permissions
  user.managedProperties.forEach(property => {
    Object.keys(property.permissions || {}).forEach(permission => {
      if ((property.permissions as any)[permission] === true) {
        allPermissions.add(permission);
      }
    });
  });

  return requiredPermissions.every(permission => allPermissions.has(permission));
};

/**
 * Get resource ID from request parameters
 */
const getResourceIdFromRequest = (
  req: AuthorizationRequest, 
  resourceType: string
): string | null => {
  const params = req.params as Record<string, string>;
  
  const mapping: Record<string, string[]> = {
    organization: ['organizationId', 'orgId', 'id'],
    property: ['propertyId', 'id'],
    unit: ['unitId', 'id'],
    lease: ['leaseId', 'id'],
    invoice: ['invoiceId', 'id'],
    maintenance: ['maintenanceId', 'requestId', 'id'],
    user: ['userId', 'id'],
  };

  const keys = mapping[resourceType] || ['id'];
  return keys.map(key => params[key]).find(id => id) || null;
};

/**
 * Get resource context (organization, property, owner information)
 */
const getResourceContext = async (
  resourceType: string,
  resourceId: string
): Promise<ResourceContext | null> => {
  try {
    switch (resourceType) {
      case 'organization':
        const organization = await db.query.organizations.findFirst({
          where: eq(organizations.id, resourceId),
        });
        return organization ? { organizationId: organization.id } : null;

      case 'property':
        const property = await db.query.properties.findFirst({
          where: eq(properties.id, resourceId),
        });
        return property ? { 
          organizationId: property.organizationId,
          propertyId: property.id 
        } : null;

      case 'unit':
        const unit = await db.query.units.findFirst({
          where: eq(units.id, resourceId),
          with: {
            property: true,
          },
        });
        return unit ? { 
          organizationId: unit.property.organizationId,
          propertyId: unit.propertyId 
        } : null;

      case 'lease':
        const lease = await db.query.leases.findFirst({
          where: eq(leases.id, resourceId),
          with: {
            property: true,
          },
        });
        return lease ? { 
          organizationId: lease.organizationId,
          propertyId: lease.propertyId,
          ownerId: lease.tenantUserId 
        } : null;

      case 'maintenance':
        const maintenance = await db.query.maintenanceRequests.findFirst({
          where: eq(maintenanceRequests.id, resourceId),
          with: {
            property: true,
          },
        });
        return maintenance ? { 
          organizationId: maintenance.organizationId,
          propertyId: maintenance.propertyId,
          ownerId: maintenance.createdByUserId 
        } : null;

      case 'user':
        const user = await db.query.users.findFirst({
          where: eq(users.id, resourceId),
        });
        return user ? { ownerId: user.id } : null;

      default:
        return null;
    }
  } catch (error) {
    console.error("Error getting resource context:", error);
    return null;
  }
};

/**
 * Pre-built authorization configurations for common scenarios
 */
export const auth = {
  // Role-based authorization
  roles: (...roles: UserRoleEnum[]) => authorize({ allowedRoles: roles }),

  // Resource-based authorization
  resource: (resourceType: AuthorizationOptions['resourceType'], options: Omit<AuthorizationOptions, 'resourceType'> = {}) =>
    authorize({ ...options, resourceType }),

  // Common permission patterns
  adminOnly: () => authorize({ allowedRoles: ['superAdmin', 'admin'] }),
  
  propertyManagement: () => authorize({ 
    allowedRoles: ['superAdmin', 'admin', 'propertyOwner', 'manager'] 
  }),

  tenantAccess: () => authorize({ 
    allowedRoles: ['superAdmin', 'admin', 'propertyOwner', 'manager', 'tenant'] 
  }),

  // Resource-specific patterns
  ownResource: (resourceType: AuthorizationOptions['resourceType']) =>
    authorize({ resourceType, allowOwner: true }),

  managedResource: (resourceType: AuthorizationOptions['resourceType']) =>
    authorize({ resourceType, allowPropertyManager: true }),

  organizationResource: (resourceType: AuthorizationOptions['resourceType']) =>
    authorize({ resourceType, allowSameOrganization: true }),

  // Combined patterns
  ownerOrManager: (resourceType: AuthorizationOptions['resourceType']) =>
    authorize({ 
      resourceType, 
      allowOwner: true, 
      allowPropertyManager: true 
    }),

  ownerOrOrganization: (resourceType: AuthorizationOptions['resourceType']) =>
    authorize({ 
      resourceType, 
      allowOwner: true, 
      allowSameOrganization: true 
    }),

  fullAccess: (resourceType: AuthorizationOptions['resourceType']) =>
    authorize({ 
      resourceType, 
      allowOwner: true, 
      allowPropertyManager: true,
      allowSameOrganization: true 
    }),
};

export default authorize;