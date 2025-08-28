// src/types/express.d.ts
import type { User } from "../models/user.model"; // or wherever your User type lives

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      organizationId?: string;
      // add more props if needed (roles, email, etc.)
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    user?: { id: string }; // since you’re also using req.user.id
  }
}