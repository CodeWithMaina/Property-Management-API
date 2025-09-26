// utils/accessControl.ts
import { and, eq } from "drizzle-orm";
import db from "../drizzle/db";
import { 
  userOrganizations, 
  properties, 
  propertyManagers,
  units,
  leases,
  invoices,
  maintenanceRequests,
  UserRoleEnum 
} from "../drizzle/schema";

export interface AccessControlResult {
  hasAccess: boolean;
  role?: UserRoleEnum;
  isOwner?: boolean;
  isPropertyManager?: boolean;
}

export const validateOrganizationAccess = async (
  userId: string, 
  organizationId: string
): Promise<AccessControlResult> => {
  const userOrg = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, userId),
      eq(userOrganizations.organizationId, organizationId)
    ),
  });
  
  return {
    hasAccess: !!userOrg,
    role: userOrg?.role,
  };
};

export const validatePropertyAccess = async (
  userId: string, 
  propertyId: string
): Promise<AccessControlResult> => {
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    with: {
      organization: true,
    },
  });

  if (!property) {
    return { hasAccess: false };
  }

  const orgAccess = await validateOrganizationAccess(userId, property.organizationId);
  if (orgAccess.hasAccess) {
    return orgAccess;
  }

  const propertyManager = await db.query.propertyManagers.findFirst({
    where: and(
      eq(propertyManagers.propertyId, propertyId),
      eq(propertyManagers.userId, userId)
    ),
  });

  return {
    hasAccess: !!propertyManager,
    role: propertyManager?.role,
    isPropertyManager: !!propertyManager,
  };
};

export const validateUnitAccess = async (
  userId: string, 
  unitId: string
): Promise<AccessControlResult> => {
  const unit = await db.query.units.findFirst({
    where: eq(units.id, unitId),
    with: {
      property: {
        with: {
          organization: true,
        },
      },
    },
  });

  if (!unit?.property) {
    return { hasAccess: false };
  }

  return validatePropertyAccess(userId, unit.propertyId);
};

export const validateRoleAccess = (
  userRole: UserRoleEnum, 
  requiredRoles: UserRoleEnum | UserRoleEnum[]
): boolean => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  const roleHierarchy: Record<UserRoleEnum, number> = {
    superAdmin: 6,
    admin: 5,
    propertyOwner: 4,
    manager: 3,
    caretaker: 2,
    tenant: 1,
  };

  const userRoleLevel = roleHierarchy[userRole];
  
  return roles.some(requiredRole => {
    const requiredRoleLevel = roleHierarchy[requiredRole];
    return userRoleLevel >= requiredRoleLevel;
  });
};

// Fix the getResourceWithParent function with proper typing
interface ResourceWithParent {
  propertyId?: string;
  organizationId?: string;
  createdByUserId?: string;
  tenantUserId?: string;
}

async function getResourceWithParent(resourceType: string, resourceId: string): Promise<ResourceWithParent | null> {
  try {
    switch (resourceType) {
      case 'lease':
        const lease = await db.query.leases.findFirst({
          where: eq(leases.id, resourceId),
        });
        return lease ? { propertyId: lease.propertyId, organizationId: lease.organizationId, tenantUserId: lease.tenantUserId } : null;
      
      case 'invoice':
        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, resourceId),
          with: {
            lease: true,
          },
        });
        return invoice?.lease ? { propertyId: invoice.lease.propertyId, organizationId: invoice.organizationId } : null;
      
      case 'maintenance':
        const maintenance = await db.query.maintenanceRequests.findFirst({
          where: eq(maintenanceRequests.id, resourceId),
        });
        return maintenance ? { propertyId: maintenance.propertyId, organizationId: maintenance.organizationId, createdByUserId: maintenance.createdByUserId } : null;
      
      default:
        return null;
    }
  } catch (error) {
    console.error("Error getting resource with parent:", error);
    return null;
  }
}

export const validateResourceAccess = async (
  userId: string,
  resourceType: 'organization' | 'property' | 'unit' | 'lease' | 'invoice' | 'maintenance',
  resourceId: string,
  requiredRole?: UserRoleEnum | UserRoleEnum[]
): Promise<AccessControlResult> => {
  let accessResult: AccessControlResult;

  switch (resourceType) {
    case 'organization':
      accessResult = await validateOrganizationAccess(userId, resourceId);
      break;
    case 'property':
      accessResult = await validatePropertyAccess(userId, resourceId);
      break;
    case 'unit':
      accessResult = await validateUnitAccess(userId, resourceId);
      break;
    case 'lease':
    case 'invoice':
    case 'maintenance':
      const resource = await getResourceWithParent(resourceType, resourceId);
      if (!resource?.propertyId) {
        return { hasAccess: false };
      }
      accessResult = await validatePropertyAccess(userId, resource.propertyId);
      break;
    default:
      return { hasAccess: false };
  }

  if (requiredRole && accessResult.role) {
    accessResult.hasAccess = accessResult.hasAccess && 
      validateRoleAccess(accessResult.role, requiredRole);
  }

  return accessResult;
};