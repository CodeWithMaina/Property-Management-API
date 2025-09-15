import { and, eq } from "drizzle-orm";
import db from "../drizzle/db";
import { userOrganizations } from "../drizzle/schema";

// utils/accessControl.ts
export const validateOrganizationAccess = async (
  userId: string, 
  organizationId: string
): Promise<boolean> => {
  const userOrg = await db.query.userOrganizations.findFirst({
    where: and(
      eq(userOrganizations.userId, userId),
      eq(userOrganizations.organizationId, organizationId)
    ),
  });
  
  return !!userOrg;
};