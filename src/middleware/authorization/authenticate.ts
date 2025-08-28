import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { AuthorizationRequest } from './authorization.types';
import { AuthenticationError } from '../../utils/errorHandler';
import { users } from '../../drizzle/schema';
import db from '../../drizzle/db';
import { createErrorResponse } from '../../utils/apiResponse/apiResponse.helper';

/**
 * Authentication middleware that populates user with organizations and managed properties
 */
export const authenticate = async (
  req: AuthorizationRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // In a real implementation, you would verify JWT token here
    // For this example, we'll assume user ID is available in req.userId
    const userId = (req as any).userId; // This would come from your JWT middleware
    
    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    // Fetch user with organizations and managed properties
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        userOrganizations: {
          with: {
            organization: true,
          },
        },
        propertyManagers: {
          with: {
            property: true,
          },
        },
      },
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Attach user to request with simplified organization and property info
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      organizations: user.userOrganizations.map(org => ({
        id: org.id,
        organizationId: org.organizationId,
        role: org.role,
        isPrimary: org.isPrimary,
      })),
      managedProperties: user.propertyManagers.map(pm => ({
        id: pm.id,
        propertyId: pm.propertyId,
        role: pm.role,
      })),
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json(
        createErrorResponse(error.message, 'AUTHENTICATION_ERROR')
      );
    }

    return res.status(500).json(
      createErrorResponse('Authentication failed', 'AUTHENTICATION_ERROR')
    );
  }
};