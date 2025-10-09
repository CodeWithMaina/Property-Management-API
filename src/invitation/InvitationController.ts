// controllers/invitation/InvitationController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { createErrorResponse, createSuccessResponse } from "../utils/apiResponse/apiResponse.types";
import { formatZodError } from "../utils/formatZodError";
import { InvitationService } from "./InvitationService";
import { PermissionService } from "./PermissionService";

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(['tenant', 'caretaker', 'manager', 'propertyOwner', 'admin', 'superAdmin']), // Remove 'guest'
  organizationId: z.string().uuid().optional(),
  propertyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  permissions: z.record(z.union([z.boolean(), z.number(), z.string()])).optional(),
  expiresInHours: z.number().min(1).max(720).optional(),
});

const acceptInvitationSchema = z.object({
  token: z.string().uuid("Invalid invitation token"),
  userData: z.object({
    fullName: z.string().min(1, "Full name is required"),
    phone: z.string().optional(),
  }).optional(),
});

const invitationActionSchema = z.object({
  id: z.string().uuid("Invalid invitation ID"),
});

export class InvitationController {
  private invitationService: InvitationService;
  private permissionService: PermissionService;

  constructor() {
    this.invitationService = new InvitationService();
    this.permissionService = new PermissionService();
  }

  async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createInvitationSchema.parse(req.body);
      const inviter = (req as any).user;

      if (!inviter) {
        res.status(401).json(
          createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
        );
        return;
      }

      const invitationData = {
        ...validatedData,
        invitedByUserId: inviter.userId,
      };

      const invitation = await this.invitationService.createInvitation(invitationData, inviter);

      const response = createSuccessResponse(
        {
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            organizationId: invitation.organizationId,
            propertyId: invitation.propertyId,
            unitId: invitation.unitId,
            expiresAt: invitation.expiresAt,
            createdAt: invitation.createdAt,
          },
        },
        "Invitation sent successfully"
      );

      res.status(201).json(response);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json(
          createErrorResponse("Validation failed", "VALIDATION_ERROR", formatZodError(error))
        );
        return;
      }

      console.error("Create invitation error:", error);
      res.status(400).json(
        createErrorResponse(error.message || "Failed to create invitation", "INVITATION_ERROR")
      );
    }
  }

  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = acceptInvitationSchema.parse(req.body);

      const result = await this.invitationService.acceptInvitation(
        validatedData.token,
        validatedData.userData
      );

      const response = createSuccessResponse(
        {
          user: {
            id: result.user.id,
            fullName: result.user.fullName,
            email: result.user.email,
          },
          organization: result.organization ? {
            id: result.organization.id,
            name: result.organization.name,
          } : null,
        },
        "Invitation accepted successfully"
      );

      res.status(200).json(response);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json(
          createErrorResponse("Validation failed", "VALIDATION_ERROR", formatZodError(error))
        );
        return;
      }

      console.error("Accept invitation error:", error);
      res.status(400).json(
        createErrorResponse(error.message || "Failed to accept invitation", "INVITATION_ERROR")
      );
    }
  }

  async declineInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json(
          createErrorResponse("Invitation token is required", "VALIDATION_ERROR")
        );
        return;
      }

      await this.invitationService.declineInvitation(token);

      const response = createSuccessResponse(
        null,
        "Invitation declined successfully"
      );

      res.status(200).json(response);

    } catch (error: any) {
      console.error("Decline invitation error:", error);
      res.status(400).json(
        createErrorResponse(error.message || "Failed to decline invitation", "INVITATION_ERROR")
      );
    }
  }

  async revokeInvitation(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = invitationActionSchema.parse(req.params);
      const revoker = (req as any).user as any;

      if (!revoker) {
        res.status(401).json(
          createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
        );
        return;
      }

      await this.invitationService.revokeInvitation(validatedData.id, revoker);

      const response = createSuccessResponse(
        null,
        "Invitation revoked successfully"
      );

      res.status(200).json(response);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json(
          createErrorResponse("Validation failed", "VALIDATION_ERROR", formatZodError(error))
        );
        return;
      }

      console.error("Revoke invitation error:", error);
      res.status(400).json(
        createErrorResponse(error.message || "Failed to revoke invitation", "INVITATION_ERROR")
      );
    }
  }

  async getInvitations(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.query;
      const requester = (req as any).user as any;

      if (!requester) {
        res.status(401).json(
          createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
        );
        return;
      }

      if (!organizationId || typeof organizationId !== 'string') {
        res.status(400).json(
          createErrorResponse("Organization ID is required", "VALIDATION_ERROR")
        );
        return;
      }

      const invitations = await this.invitationService.getPendingInvitations(organizationId, requester);

      const response = createSuccessResponse(
        {
          invitations: invitations.map(inv => ({
            id: inv.id,
            email: inv.email,
            role: inv.role,
            organizationId: inv.organizationId,
            propertyId: inv.propertyId,
            unitId: inv.unitId,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
            invitedBy: inv.invitedBy ? {
              id: inv.invitedBy.id,
              fullName: inv.invitedBy.fullName,
              email: inv.invitedBy.email,
            } : null,
            organization: inv.organization ? {
              id: inv.organization.id,
              name: inv.organization.name,
            } : null,
          })),
        },
        "Invitations retrieved successfully"
      );

      res.status(200).json(response);

    } catch (error: any) {
      console.error("Get invitations error:", error);
      res.status(400).json(
        createErrorResponse(error.message || "Failed to get invitations", "INVITATION_ERROR")
      );
    }
  }

  async resendInvitation(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = invitationActionSchema.parse(req.params);
      const resender = (req as any).user as any;

      if (!resender) {
        res.status(401).json(
          createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
        );
        return;
      }

      const success = await this.invitationService.resendInvitation(validatedData.id, resender);

      if (!success) {
        res.status(400).json(
          createErrorResponse("Failed to resend invitation", "INVITATION_ERROR")
        );
        return;
      }

      const response = createSuccessResponse(
        null,
        "Invitation resent successfully"
      );

      res.status(200).json(response);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json(
          createErrorResponse("Validation failed", "VALIDATION_ERROR", formatZodError(error))
        );
        return;
      }

      console.error("Resend invitation error:", error);
      res.status(400).json(
        createErrorResponse(error.message || "Failed to resend invitation", "INVITATION_ERROR")
      );
    }
  }

  async getAllowedRoles(req: Request, res: Response): Promise<void> {
    try {
      const requester = (req as any).user as any;

      if (!requester) {
        res.status(401).json(
          createErrorResponse("Authentication required", "AUTHENTICATION_ERROR")
        );
        return;
      }

      const allowedRoles = this.permissionService.getAllowedRolesForInviter(requester);

      const response = createSuccessResponse(
        {
          allowedRoles: allowedRoles.map(role => ({
            role,
            level: this.permissionService.getRoleScope(role),
            permissions: this.permissionService.getDefaultPermissions(role),
          })),
        },
        "Allowed roles retrieved successfully"
      );

      res.status(200).json(response);

    } catch (error: any) {
      console.error("Get allowed roles error:", error);
      res.status(500).json(
        createErrorResponse(error.message || "Failed to get allowed roles", "PERMISSION_ERROR")
      );
    }
  }
}