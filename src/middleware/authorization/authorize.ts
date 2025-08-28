import { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import {
  users,
  organizations,
  properties,
  units,
  leases,
  invoices,
  payments,
  maintenanceRequests,
  userOrganizations,
  propertyManagers,
  UserRoleEnum,
} from '../../drizzle/schema';
import {
  AuthorizationRequest,
  AuthorizationOptions,
  ResourceOrganizationMapping,
} from './authorization.types';
import db from '../../drizzle/db';
import { createErrorResponse } from '../../utils/apiResponse/apiResponse.helper';
import { AuthorizationError, NotFoundError } from '../../utils/errorHandler';

// Resource to organization mapping
const RESOURCE_ORGANIZATION_MAPPINGS: ResourceOrganizationMapping[] = [
  { resourceType: 'user', organizationIdPath: 'organizations.organizationId' },
  { resourceType: 'property', organizationIdPath: 'organizationId' },
  { resourceType: 'unit', organizationIdPath: 'property.organizationId' },
  { resourceType: 'lease', organizationIdPath: 'organizationId', ownerIdPath: 'tenantUserId' },
  { resourceType: 'invoice', organizationIdPath: 'organizationId' },
  { resourceType: 'payment', organizationIdPath: 'organizationId' },
  { 
    resourceType: 'maintenanceRequest', 
    organizationIdPath: 'organizationId',
    propertyIdPath: 'propertyId'
  },
];

/**
 * Main authorization middleware
 */
export const authorize = (options: AuthorizationOptions = {}) => {
  return async (req: AuthorizationRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        throw new AuthorizationError('Authentication required');
      }

      // Check if user has any of the allowed roles globally
      const hasGlobalRole = await checkGlobalRoles(user, options.allowedRoles);
      if (hasGlobalRole) {
        return next();
      }

      // Check custom authorization function if provided
      if (options.customCheck) {
        const customResult = await options.customCheck(req);
        if (customResult) {
          return next();
        }
      }

      // Check resource-specific permissions
      const hasResourceAccess = await checkResourceAccess(req, options);
      if (hasResourceAccess) {
        return next();
      }

      throw new AuthorizationError('Insufficient permissions');
      
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json(
          createErrorResponse(error.message, 'AUTHORIZATION_ERROR')
        );
      }
      
      return res.status(500).json(
        createErrorResponse('Authorization check failed', 'AUTHORIZATION_ERROR')
      );
    }
  };
};

/**
 * Check if user has global role permissions
 */
const checkGlobalRoles = async (
  user: any,
  allowedRoles?: UserRoleEnum[]
): Promise<boolean> => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return false;
  }

  // Check user's organizations for allowed roles
  const hasOrgRole = user.organizations?.some((org: { role: string; }) => 
    allowedRoles.includes(org.role as UserRoleEnum)
  );

  // Check user's property management roles
  const hasPropertyRole = user.managedProperties?.some((property: { role: string; }) => 
    allowedRoles.includes(property.role as UserRoleEnum)
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
  const { resourceType, allowOwner, allowPropertyManager, allowSameOrganization } = options;
  
  if (!resourceType) {
    return false;
  }

  const resourceId = getResourceIdFromRequest(req, resourceType);
  if (!resourceId) {
    return false;
  }

  // Get the resource with organization information
  const resource = await getResourceWithOrganization(resourceType, resourceId);
  if (!resource) {
    throw new NotFoundError(`${resourceType} resource`);
  }

  const checks: Promise<boolean>[] = [];

  // Check if user owns the resource
  if (allowOwner) {
    checks.push(checkOwnership(req, resourceType, resource));
  }

  // Check if user manages the property containing the resource
  if (allowPropertyManager) {
    checks.push(checkPropertyManagement(req, resourceType, resource));
  }

  // Check if user is in the same organization as the resource
  if (allowSameOrganization) {
    checks.push(checkSameOrganization(req, resource));
  }

  // Wait for all checks to complete
  const results = await Promise.all(checks);
  return results.some(result => result === true);
};

/**
 * Get resource ID from request based on resource type
 */
const getResourceIdFromRequest = (req: AuthorizationRequest, resourceType: string): string | null => {
  // Use type assertion to access params safely
  const params = req.params as Record<string, string | undefined>;
  
  switch (resourceType) {
    case 'user':
      return params.userId || params.id || null;
    case 'property':
      return params.propertyId || params.id || null;
    case 'unit':
      return params.unitId || params.id || null;
    case 'lease':
      return params.leaseId || params.id || null;
    case 'invoice':
      return params.invoiceId || params.id || null;
    case 'payment':
      return params.paymentId || params.id || null;
    case 'maintenanceRequest':
      return params.requestId || params.id || null;
    default:
      return params.id || null;
  }
};

/**
 * Get resource with organization information
 */
const getResourceWithOrganization = async (
  resourceType: string,
  resourceId: string
): Promise<any> => {
  switch (resourceType) {
    case 'user':
      return db.query.users.findFirst({
        where: eq(users.id, resourceId),
        with: {
          userOrganizations: {
            with: {
              organization: true,
            },
          },
        },
      });

    case 'property':
      return db.query.properties.findFirst({
        where: eq(properties.id, resourceId),
        with: {
          organization: true,
        },
      });

    case 'unit':
      return db.query.units.findFirst({
        where: eq(units.id, resourceId),
        with: {
          property: {
            with: {
              organization: true,
            },
          },
        },
      });

    case 'lease':
      return db.query.leases.findFirst({
        where: eq(leases.id, resourceId),
        with: {
          organization: true,
          property: true,
        },
      });

    case 'invoice':
      return db.query.invoices.findFirst({
        where: eq(invoices.id, resourceId),
        with: {
          organization: true,
        },
      });

    case 'payment':
      return db.query.payments.findFirst({
        where: eq(payments.id, resourceId),
        with: {
          organization: true,
        },
      });

    case 'maintenanceRequest':
      return db.query.maintenanceRequests.findFirst({
        where: eq(maintenanceRequests.id, resourceId),
        with: {
          organization: true,
          property: true,
        },
      });

    default:
      return null;
  }
};

/**
 * Check if user owns the resource
 */
const checkOwnership = async (
  req: AuthorizationRequest,
  resourceType: string,
  resource: any
): Promise<boolean> => {
  const user = req.user!;

  switch (resourceType) {
    case 'user':
      return resource.id === user.id;

    case 'lease':
      return resource.tenantUserId === user.id;

    case 'maintenanceRequest':
      return resource.createdByUserId === user.id;

    default:
      return false;
  }
};

/**
 * Check if user manages the property containing the resource
 */
const checkPropertyManagement = async (
  req: AuthorizationRequest,
  resourceType: string,
  resource: any
): Promise<boolean> => {
  const user = req.user!;
  const managedProperties = user.managedProperties || [];

  let propertyId: string | undefined;

  switch (resourceType) {
    case 'property':
      propertyId = resource.id;
      break;

    case 'unit':
      propertyId = resource.propertyId;
      break;

    case 'lease':
      propertyId = resource.propertyId;
      break;

    case 'maintenanceRequest':
      propertyId = resource.propertyId;
      break;

    default:
      return false;
  }

  if (!propertyId) {
    return false;
  }

  return managedProperties.some(property => property.propertyId === propertyId);
};

/**
 * Check if user is in the same organization as the resource
 */
const checkSameOrganization = async (
  req: AuthorizationRequest,
  resource: any
): Promise<boolean> => {
  const user = req.user!;
  const userOrganizations = user.organizations || [];

  // Extract organization ID from resource based on resource type
  let resourceOrganizationId: string | undefined;

  if (resource.organizationId) {
    resourceOrganizationId = resource.organizationId;
  } else if (resource.organization?.id) {
    resourceOrganizationId = resource.organization.id;
  } else if (resource.property?.organizationId) {
    resourceOrganizationId = resource.property.organizationId;
  } else if (resource.userOrganizations) {
    // For user resources, check if they share any organizations
    const userOrgIds = resource.userOrganizations.map((uo: any) => uo.organizationId);
    return userOrganizations.some(userOrg => userOrgIds.includes(userOrg.organizationId));
  }

  if (!resourceOrganizationId) {
    return false;
  }

  return userOrganizations.some(org => org.organizationId === resourceOrganizationId);
};

/**
 * Helper function to create authorization for specific resource types
 */
export const authorizeResource = (
  resourceType: AuthorizationOptions['resourceType'],
  options: Omit<AuthorizationOptions, 'resourceType'> = {}
) => {
  return authorize({ ...options, resourceType });
};

/**
 * Pre-built authorization configurations for common scenarios
 */
export const auth = {
  // Admin only (superAdmin, admin)
  adminOnly: () => authorize({ 
    allowedRoles: ['superAdmin', 'admin'] 
  }),

  // Property management (admin, propertyOwner, manager)
  propertyManagement: () => authorize({ 
    allowedRoles: ['superAdmin', 'admin', 'propertyOwner', 'manager'] 
  }),

  // Tenant access (tenant + above roles)
  tenantAccess: () => authorize({ 
    allowedRoles: ['superAdmin', 'admin', 'propertyOwner', 'manager', 'tenant'] 
  }),

  // User can access their own data
  ownUser: () => authorizeResource('user', { allowOwner: true }),

  // User can access leases where they are the tenant
  ownLease: () => authorizeResource('lease', { allowOwner: true }),

  // User can access maintenance requests they created
  ownMaintenanceRequest: () => authorizeResource('maintenanceRequest', { allowOwner: true }),

  // Property managers can access resources in their properties
  managedProperty: (resourceType: AuthorizationOptions['resourceType']) => 
    authorizeResource(resourceType, { allowPropertyManager: true }),

  // Users in same organization can access resources
  sameOrganization: (resourceType: AuthorizationOptions['resourceType']) => 
    authorizeResource(resourceType, { allowSameOrganization: true }),

  // Combined permissions: owner or same organization
  ownerOrSameOrg: (resourceType: AuthorizationOptions['resourceType']) => 
    authorizeResource(resourceType, { 
      allowOwner: true, 
      allowSameOrganization: true 
    }),

  // Combined permissions: owner or property manager
  ownerOrManager: (resourceType: AuthorizationOptions['resourceType']) => 
    authorizeResource(resourceType, { 
      allowOwner: true, 
      allowPropertyManager: true 
    }),

  // Full combined permissions
  fullAccess: (resourceType: AuthorizationOptions['resourceType']) => 
    authorizeResource(resourceType, { 
      allowOwner: true, 
      allowPropertyManager: true,
      allowSameOrganization: true 
    }),
};

export default authorize;