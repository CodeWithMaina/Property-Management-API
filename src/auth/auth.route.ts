// routes/auth/auth.enhanced.routes.ts
import { Router } from 'express';
import { AdvancedAuthMiddleware } from '../middleware/AdvancedAuthMiddleware';
import { AuthEnhancedController } from './auth.controller';

export const authRouter = Router();
export const authController = new AuthEnhancedController();

// Public routes
authRouter.post('/register', authController.register.bind(authController));
authRouter.post('/login', authController.login.bind(authController));
authRouter.post('/refresh', authController.refresh.bind(authController));
authRouter.post('/verify-email', authController.verifyEmail.bind(authController));
authRouter.post('/request-password-reset', authController.requestPasswordReset.bind(authController));
authRouter.post('/reset-password', authController.resetPassword.bind(authController));

// Protected routes
authRouter.get('/me', 
  AdvancedAuthMiddleware.requireAuth(),
  authController.getCurrentUser.bind(authController)
);

authRouter.post('/logout',
  AdvancedAuthMiddleware.requireAuth(),
  authController.logout.bind(authController)
);

authRouter.post('/change-password',
  AdvancedAuthMiddleware.requireAuth(),
  authController.changePassword.bind(authController)
);

// Email verification required routes
authRouter.get('/sensitive-data',
  AdvancedAuthMiddleware.requireEmailVerified(),
  // Controller method for sensitive data
);

// Admin only routes (keep only one copy)
authRouter.get('/admin/users',
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requireRole(['admin', 'superAdmin']),
  AdvancedAuthMiddleware.scopeToOrganization(),
  // Add admin user list controller method here
);

// Organization management routes
authRouter.get('/organization/users',
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requireOrganization(),
  AdvancedAuthMiddleware.requirePermission('canManageUsers'),
  // Get organization users
);

authRouter.post('/organization/invite',
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requireOrganization(),
  AdvancedAuthMiddleware.requirePermission('canInviteUsers'),
  AdvancedAuthMiddleware.requireHigherRole('tenant'), // Can't invite users with higher role
  // Invite user to organization
);

// Property management routes
authRouter.get('/properties',
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requireOrganization(),
  AdvancedAuthMiddleware.scopeToOrganization(),
  // Get organization properties
);

authRouter.post('/properties',
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requireOrganization(),
  AdvancedAuthMiddleware.requirePermission('canCreateProperties'),
  // Create property
);

// Financial routes
authRouter.get('/financial/reports',
  AdvancedAuthMiddleware.requireAuth(),
  AdvancedAuthMiddleware.requireOrganization(),
  AdvancedAuthMiddleware.requirePermission('canViewFinancialReports'),
  // Get financial reports
);

export default authRouter;