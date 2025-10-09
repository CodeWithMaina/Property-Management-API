// services/invitation/InvitationService.ts
import { eq, and, or, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { PermissionService } from './PermissionService';
import { PasswordService } from '../auth/PasswordService';
import db from '../drizzle/db';
import { invites, users, userOrganizations, userAuth } from '../drizzle/schema';
import { AuditLogger } from '../utils/auditLogger';
import { EmailService } from '../auth/EmailService';
import { UserContext } from '../auth/auth.types';
import { CreateInvitationData, Invitation, AcceptInvitationResult } from './invitation.types';

export class InvitationService {
  private permissionService: PermissionService;
  private emailService: EmailService;
  private auditLogger: AuditLogger;
  private passwordService: PasswordService;

  constructor() {
    this.permissionService = new PermissionService();
    this.emailService = new EmailService();
    this.auditLogger = new AuditLogger();
    this.passwordService = new PasswordService();
  }

  async createInvitation(invitationData: CreateInvitationData, inviter: UserContext): Promise<Invitation> {
    try {
      // Validate inviter permissions
      if (!this.permissionService.canInviteToRole(inviter, invitationData.role)) {
        throw new Error('You do not have permission to invite users with this role');
      }

      // Validate role assignment
      if (!this.permissionService.validatePermissionAssignment(inviter, invitationData.role)) {
        throw new Error('You cannot assign this role');
      }

      // Check for existing pending invitation
      const existingInvitation = await db.query.invites.findFirst({
        where: and(
          eq(invites.email, invitationData.email),
          eq(invites.isUsed, false)
        ),
      });

      if (existingInvitation) {
        throw new Error('A pending invitation already exists for this email');
      }

      // Check if user already exists in the organization
      if (invitationData.organizationId) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, invitationData.email),
          with: {
            userOrganizations: {
              where: eq(userOrganizations.organizationId, invitationData.organizationId)
            }
          }
        });

        if (existingUser && existingUser.userOrganizations.length > 0) {
          throw new Error('User is already a member of this organization');
        }
      }

      // Generate invitation token
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (invitationData.expiresInHours || 72));

      // Get default permissions for the role
      const defaultPermissions = this.permissionService.getDefaultPermissions(
        invitationData.role,
        {
          organizationId: invitationData.organizationId,
          propertyId: invitationData.propertyId,
          unitId: invitationData.unitId
        }
      );

      // Merge provided permissions with defaults
      const finalPermissions = {
        ...defaultPermissions,
        ...invitationData.permissions
      };

      // Create invitation
      const [invitation] = await db.insert(invites)
        .values({
          email: invitationData.email,
          organizationId: invitationData.organizationId!,
          role: invitationData.role,
          permissions: finalPermissions,
          invitedByUserId: invitationData.invitedByUserId,
          token,
          expiresAt,
        })
        .returning();

      // Cast to Invitation type
      const invitationWithRelations = {
        ...invitation,
        propertyId: invitationData.propertyId,
        unitId: invitationData.unitId,
      } as Invitation;

      // Send invitation email
      await this.emailService.sendInvitationEmail(invitationWithRelations);

      // Log invitation creation
      await this.auditLogger.logAuthEvent({
        userId: inviter.userId,
        action: 'create',
        resourceType: 'invitation',
        resourceId: invitation.id,
        ipAddress: 'system',
        userAgent: 'system',
        timestamp: new Date(),
        metadata: {
          invitedEmail: invitationData.email,
          role: invitationData.role,
          organizationId: invitationData.organizationId,
          propertyId: invitationData.propertyId,
          unitId: invitationData.unitId
        }
      });

      return invitationWithRelations;

    } catch (error) {
      console.error('Create invitation error:', error);
      throw error;
    }
  }

  async sendInvitation(invitationId: string): Promise<boolean> {
    try {
      const invitation = await db.query.invites.findFirst({
        where: eq(invites.id, invitationId),
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.isUsed) {
        throw new Error('Cannot send used invitation');
      }

      await this.emailService.sendInvitationEmail(invitation as Invitation);
      return true;

    } catch (error) {
      console.error('Send invitation error:', error);
      return false;
    }
  }

  async acceptInvitation(token: string, userData?: { fullName: string; phone?: string }): Promise<AcceptInvitationResult> {
    try {
      const invitation = await db.query.invites.findFirst({
        where: and(
          eq(invites.token, token),
          eq(invites.isUsed, false)
        ),
        with: {
          organization: true,
          invitedBy: {
            columns: {
              id: true,
              fullName: true,
              email: true,
            }
          }
        }
      });

      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      return await db.transaction(async (tx) => {
        // Check if user already exists
        let user = await tx.query.users.findFirst({
          where: eq(users.email, invitation.email),
        });

        // Create user if doesn't exist
        if (!user) {
          if (!userData) {
            throw new Error('User data required for new user');
          }

          [user] = await tx.insert(users)
            .values({
              fullName: userData.fullName || invitation.email.split('@')[0],
              email: invitation.email,
              phone: userData.phone,
              isActive: true,
            })
            .returning();

          // Create user auth record with temporary password
          const tempPassword = this.passwordService.generateTemporaryPassword();
          const hashedPassword = await this.passwordService.hashPassword(tempPassword);

          await tx.insert(userAuth)
            .values({
              userId: user.id,
              email: invitation.email,
              passwordHash: hashedPassword,
              isEmailVerified: true,
            });

          // Send welcome email with temporary password
          await this.emailService.sendWelcomeEmail(user.email, user.fullName, tempPassword);
        }

        // Link user to organization
        if (invitation.organizationId) {
          await tx.insert(userOrganizations)
            .values({
              userId: user.id,
              organizationId: invitation.organizationId,
              role: invitation.role,
              permissions: invitation.permissions || {},
              isPrimary: false,
            });
        }

        // Update invitation status
        await tx.update(invites)
          .set({ 
            isUsed: true,
            usedAt: new Date()
          })
          .where(eq(invites.id, invitation.id));

        // Log invitation acceptance
        await this.auditLogger.logAuthEvent({
          userId: user.id,
          action: 'create',
          resourceType: 'invitation',
          resourceId: invitation.id,
          ipAddress: 'system',
          userAgent: 'system',
          timestamp: new Date(),
          metadata: {
            invitedBy: invitation.invitedByUserId,
            role: invitation.role,
            organizationId: invitation.organizationId
          }
        });

        return {
          user,
          organization: invitation.organization,
          property: undefined,
          unit: undefined
        };

      });

    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  }

  async declineInvitation(token: string): Promise<void> {
    try {
      const invitation = await db.query.invites.findFirst({
        where: and(
          eq(invites.token, token),
          eq(invites.isUsed, false)
        ),
      });

      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      await db.update(invites)
        .set({ isUsed: true })
        .where(eq(invites.id, invitation.id));

    } catch (error) {
      console.error('Decline invitation error:', error);
      throw error;
    }
  }

  async revokeInvitation(invitationId: string, revoker: UserContext): Promise<void> {
    try {
      const invitation = await db.query.invites.findFirst({
        where: eq(invites.id, invitationId),
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check if revoker has permission to revoke this invitation
      if (invitation.invitedByUserId !== revoker.userId) {
        // Check if revoker is admin in the same organization
        const revokerOrg = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, revoker.userId),
            eq(userOrganizations.organizationId, invitation.organizationId),
            or(
              eq(userOrganizations.role, 'admin'),
              eq(userOrganizations.role, 'superAdmin')
            )
          ),
        });

        if (!revokerOrg) {
          throw new Error('You do not have permission to revoke this invitation');
        }
      }

      await db.delete(invites)
        .where(eq(invites.id, invitationId));

    } catch (error) {
      console.error('Revoke invitation error:', error);
      throw error;
    }
  }

  async getPendingInvitations(organizationId: string, requester: UserContext): Promise<Invitation[]> {
    try {
      // Check if requester has permission to view invitations
      const requesterOrg = await db.query.userOrganizations.findFirst({
        where: and(
          eq(userOrganizations.userId, requester.userId),
          eq(userOrganizations.organizationId, organizationId)
        ),
      });

      if (!requesterOrg) {
        throw new Error('You do not have access to this organization');
      }

      const pendingInvitations = await db.query.invites.findMany({
        where: and(
          eq(invites.organizationId, organizationId),
          eq(invites.isUsed, false)
        ),
        with: {
          invitedBy: {
            columns: {
              id: true,
              fullName: true,
              email: true,
            }
          },
          organization: {
            columns: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: [desc(invites.createdAt)],
      });

      return pendingInvitations as Invitation[];

    } catch (error) {
      console.error('Get pending invitations error:', error);
      throw error;
    }
  }

  async resendInvitation(invitationId: string, resender: UserContext): Promise<boolean> {
    try {
      const invitation = await db.query.invites.findFirst({
        where: eq(invites.id, invitationId),
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check permissions
      if (invitation.invitedByUserId !== resender.userId) {
        const resenderOrg = await db.query.userOrganizations.findFirst({
          where: and(
            eq(userOrganizations.userId, resender.userId),
            eq(userOrganizations.organizationId, invitation.organizationId),
            or(
              eq(userOrganizations.role, 'admin'),
              eq(userOrganizations.role, 'superAdmin')
            )
          ),
        });

        if (!resenderOrg) {
          throw new Error('You do not have permission to resend this invitation');
        }
      }

      // Update expiration
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 72);

      await db.update(invites)
        .set({ 
          expiresAt: newExpiresAt,
        })
        .where(eq(invites.id, invitationId));

      // Resend email
      await this.emailService.sendInvitationEmail(invitation as Invitation);

      return true;

    } catch (error) {
      console.error('Resend invitation error:', error);
      return false;
    }
  }

  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await db.delete(invites)
        .where(and(
          eq(invites.isUsed, false),
          eq(invites.expiresAt, new Date())
        ));

      return result.rowCount || 0;

    } catch (error) {
      console.error('Cleanup expired invitations error:', error);
      return 0;
    }
  }
}