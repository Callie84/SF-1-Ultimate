// /apps/ai-service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sf1-super-secret-jwt-key-change-in-production';

export interface AuthUser {
  id: string;
  role: string;
  premium: boolean;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  premium?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // First check for X-User-Id header (from Traefik ForwardAuth)
  let userId = req.headers['x-user-id'] as string;
  let userRole = req.headers['x-user-role'] as string;
  let userPremium = req.headers['x-user-premium'] === 'true';

  // If no X-User-Id, try to extract from Authorization header (JWT)
  if (!userId) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();

      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
          userId = payload.userId;
          userRole = payload.role || 'USER';
          userPremium = payload.premium || false;
        } catch (jwtError) {
          res.status(401).json({ error: 'Invalid token' });
          return;
        }
      }
    }
  }

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = {
    id: userId,
    role: userRole,
    premium: userPremium
  };

  next();
}

export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // First check for X-User-Id header (from Traefik ForwardAuth)
  let userId = req.headers['x-user-id'] as string;
  let userRole = req.headers['x-user-role'] as string;
  let userPremium = req.headers['x-user-premium'] === 'true';

  // If no X-User-Id, try to extract from Authorization header (JWT)
  if (!userId) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();

      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
          userId = payload.userId;
          userRole = payload.role || 'USER';
          userPremium = payload.premium || false;
        } catch (jwtError) {
          // Token invalid, continue without user
        }
      }
    }
  }

  if (userId) {
    req.user = {
      id: userId,
      role: userRole,
      premium: userPremium
    };
  }

  next();
}
