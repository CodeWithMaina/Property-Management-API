// routes/invitation.routes.ts
import { Router } from 'express';
import { InvitationController } from './InvitationController';
import { AdvancedAuthMiddleware } from '../middleware/AdvancedAuthMiddleware';

const router = Router();
const invitationController = new InvitationController();

// Public routes
router.post('/accept', invitationController.acceptInvitation.bind(invitationController));
router.post('/decline', invitationController.declineInvitation.bind(invitationController));

// Protected routes
router.post('/', 
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requirePermission('canInviteUsers'),
  invitationController.createInvitation.bind(invitationController)
);

router.get('/', 
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requirePermission('canManageUsers'),
  invitationController.getInvitations.bind(invitationController)
);

router.get('/allowed-roles', 
  AdvancedAuthMiddleware.requireAuth(),
  invitationController.getAllowedRoles.bind(invitationController)
);

router.post('/:id/resend', 
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requirePermission('canInviteUsers'),
  invitationController.resendInvitation.bind(invitationController)
);

router.delete('/:id', 
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requirePermission('canRemoveUsers'),
  invitationController.revokeInvitation.bind(invitationController)
);

export default router;