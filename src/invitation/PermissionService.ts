// services/invitation/PermissionService.ts
import {
  InvitationScope,
  PermissionContext,
  UserContext,
  ROLE_HIERARCHY,
} from "../auth/auth.types";
import { UserRole } from "../drizzle/schema";

// Change from interface to type with index signature
export type Permissions = Record<string, boolean | number | string> & {
  // Property permissions
  canManageProperties?: boolean;
  canCreateProperties?: boolean;
  canDeleteProperties?: boolean;
  canViewProperties?: boolean;

  // User management permissions
  canManageUsers?: boolean;
  canInviteUsers?: boolean;
  canRemoveUsers?: boolean;
  canChangeUserRoles?: boolean;

  // Organization permissions
  canManageOrganizationSettings?: boolean;
  canViewFinancials?: boolean;
  canManageFinancials?: boolean;

  // Unit permissions
  canManageUnits?: boolean;
  canViewUnits?: boolean;

  // Tenant permissions
  canManageTenants?: boolean;
  canViewTenants?: boolean;

  // Maintenance permissions
  canManageMaintenance?: boolean;
  canViewMaintenance?: boolean;

  // Document permissions
  canManageDocuments?: boolean;
  canViewDocuments?: boolean;
};

export class PermissionService {
  private static readonly ROLE_SCOPES: Record<UserRole, InvitationScope> = {
    superAdmin: "global",
    admin: "organization",
    propertyOwner: "property",
    manager: "property",
    caretaker: "property",
    tenant: "unit",
  };

  private static readonly DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
    superAdmin: {
      canManageProperties: true,
      canCreateProperties: true,
      canDeleteProperties: true,
      canViewProperties: true,
      canManageUsers: true,
      canInviteUsers: true,
      canRemoveUsers: true,
      canChangeUserRoles: true,
      canManageOrganizationSettings: true,
      canViewFinancials: true,
      canManageFinancials: true,
      canManageUnits: true,
      canViewUnits: true,
      canManageTenants: true,
      canViewTenants: true,
      canManageMaintenance: true,
      canViewMaintenance: true,
      canManageDocuments: true,
      canViewDocuments: true,
    },
    admin: {
      canManageProperties: true,
      canCreateProperties: true,
      canDeleteProperties: true,
      canViewProperties: true,
      canManageUsers: true,
      canInviteUsers: true,
      canRemoveUsers: true,
      canChangeUserRoles: true,
      canManageOrganizationSettings: true,
      canViewFinancials: true,
      canManageFinancials: true,
      canManageUnits: true,
      canViewUnits: true,
      canManageTenants: true,
      canViewTenants: true,
      canManageMaintenance: true,
      canViewMaintenance: true,
      canManageDocuments: true,
      canViewDocuments: true,
    },
    propertyOwner: {
      canManageProperties: true,
      canCreateProperties: true,
      canDeleteProperties: false,
      canViewProperties: true,
      canManageUsers: true,
      canInviteUsers: true,
      canRemoveUsers: true,
      canChangeUserRoles: true,
      canManageOrganizationSettings: false,
      canViewFinancials: true,
      canManageFinancials: true,
      canManageUnits: true,
      canViewUnits: true,
      canManageTenants: true,
      canViewTenants: true,
      canManageMaintenance: true,
      canViewMaintenance: true,
      canManageDocuments: true,
      canViewDocuments: true,
    },
    manager: {
      canManageProperties: true,
      canCreateProperties: true,
      canDeleteProperties: false,
      canViewProperties: true,
      canManageUsers: true,
      canInviteUsers: true,
      canRemoveUsers: true,
      canChangeUserRoles: true,
      canManageOrganizationSettings: false,
      canViewFinancials: true,
      canManageFinancials: true,
      canManageUnits: true,
      canViewUnits: true,
      canManageTenants: true,
      canViewTenants: true,
      canManageMaintenance: true,
      canViewMaintenance: true,
      canManageDocuments: true,
      canViewDocuments: true,
    },
    caretaker: {
      canManageProperties: false,
      canCreateProperties: false,
      canDeleteProperties: false,
      canViewProperties: true,
      canManageUsers: false,
      canInviteUsers: false,
      canRemoveUsers: false,
      canChangeUserRoles: false,
      canManageOrganizationSettings: false,
      canViewFinancials: false,
      canManageFinancials: false,
      canManageUnits: true,
      canViewUnits: true,
      canManageTenants: false,
      canViewTenants: true,
      canManageMaintenance: true,
      canViewMaintenance: true,
      canManageDocuments: false,
      canViewDocuments: true,
    },
    tenant: {
      canManageProperties: false,
      canCreateProperties: false,
      canDeleteProperties: false,
      canViewProperties: false,
      canManageUsers: false,
      canInviteUsers: false,
      canRemoveUsers: false,
      canChangeUserRoles: false,
      canManageOrganizationSettings: false,
      canViewFinancials: false,
      canManageFinancials: false,
      canManageUnits: false,
      canViewUnits: true,
      canManageTenants: false,
      canViewTenants: false,
      canManageMaintenance: false,
      canViewMaintenance: true,
      canManageDocuments: false,
      canViewDocuments: true,
    },
  };

  getDefaultPermissions(
    role: UserRole,
    context?: PermissionContext
  ): Permissions {
    const basePermissions = { ...PermissionService.DEFAULT_PERMISSIONS[role] };

    // Apply context-specific permission adjustments
    if (context) {
      if (context.unitId) {
        // Unit-scoped permissions
        basePermissions.canManageProperties = false;
        basePermissions.canCreateProperties = false;
        basePermissions.canDeleteProperties = false;
      }

      if (context.propertyId && !context.unitId) {
        // Property-scoped permissions
        basePermissions.canManageOrganizationSettings = false;
      }
    }

    return basePermissions;
  }

  generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  validatePermissionAssignment(
    assigner: UserContext,
    targetRole: UserRole
  ): boolean {
    const assignerMaxRole = this.getHighestRole(assigner.roles);
    const targetRoleLevel = ROLE_HIERARCHY[targetRole];

    // Can only assign roles at or below your own level
    return assignerMaxRole >= targetRoleLevel;
  }

  canInviteToRole(inviter: UserContext, targetRole: UserRole): boolean {
    const inviterMaxRole = this.getHighestRole(inviter.roles);
    const targetRoleLevel = ROLE_HIERARCHY[targetRole];

    // Can only invite to roles at or below your own level
    return inviterMaxRole >= targetRoleLevel;
  }

  getRoleScope(role: UserRole): InvitationScope {
    return PermissionService.ROLE_SCOPES[role];
  }

  private getHighestRole(roles: UserRole[]): number {
    return Math.max(...roles.map((role) => ROLE_HIERARCHY[role]));
  }

  // Check if user has specific permission
  hasPermission(user: UserContext, permission: string): boolean {
    return user.permissions[permission] === true;
  }

  // Get allowed roles for inviter
  getAllowedRolesForInviter(inviter: UserContext): UserRole[] {
    const inviterMaxRole = this.getHighestRole(inviter.roles);

    return Object.entries(ROLE_HIERARCHY)
      .filter(([_, level]) => level <= inviterMaxRole)
      .map(([role]) => role as UserRole);
  }
}
