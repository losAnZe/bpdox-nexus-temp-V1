import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Export the Interface so it can be imported in routes
export interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    role: string; // Changed from specific union to string to avoid type conflicts with JWT payload
    two_factor_enabled: boolean;
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Use return to exit the function, but don't return the Response object itself to void
    res.status(401).json({ error: "Access Denied: No Token Provided" });
    return;
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET as string);
    // Cast req to AuthRequest to assign user
    (req as AuthRequest).user = verified as any;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or Expired Token" });
    return;
  }
};

// Role-Based Access Control (RBAC)
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      res.status(403).json({ 
        error: "Forbidden: Insufficient Permissions" 
      });
      return;
    }
    next();
  };
};

// Granular IAM Permission Middleware
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const checkPermission = (moduleName: string, action: string = 'view') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    
    if (!authReq.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // SUDO_ADMIN has bypass access to all modules
    if (authReq.user.role === 'SUDO_ADMIN') {
      return next();
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: authReq.user.id },
        select: { role: true, permissions: true }
      });

      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      if (user.role === 'SUDO_ADMIN') {
        return next();
      }

      const permissions = (user.permissions as any) || {};
      const modulePermissions = permissions[moduleName] || [];

      // Check if action (view, create, edit, delete, email, etc.) is allowed
      if (Array.isArray(modulePermissions) && modulePermissions.includes(action)) {
        return next();
      }

      res.status(403).json({ 
        error: `Access Denied: You do not have '${action}' permission for ${moduleName}.` 
      });
      return;
    } catch (err) {
      res.status(500).json({ error: "Permission validation failed" });
      return;
    }
  };
};