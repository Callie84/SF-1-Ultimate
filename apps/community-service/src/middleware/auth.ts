// /apps/community-service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'sf1-super-secret-jwt-key-change-in-production';

interface AuthUser {
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

/**
 * Auth-Middleware (Required)
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // First check for X-User-Id header (from Traefik ForwardAuth)
    let userId = req.headers['x-user-id'] as string;
    let userRole = req.headers['x-user-role'] as string;
    let userPremium = req.headers['x-user-premium'] === 'true';

    // If no X-User-Id, try to extract from Authorization header (JWT)
    if (!userId) {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED', 401);
      }

      const token = authHeader.replace('Bearer ', '').trim();

      if (!token) {
        throw new AppError('UNAUTHORIZED', 401);
      }

      try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        userId = payload.userId;
        userRole = payload.role || 'user';
        userPremium = payload.premium || false;
      } catch (jwtError) {
        throw new AppError('UNAUTHORIZED', 401);
      }
    }

    if (!userId) {
      throw new AppError('UNAUTHORIZED', 401);
    }

    req.user = {
      id: userId,
      role: userRole,
      premium: userPremium
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional Auth (für Public-Endpoints)
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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
          userRole = payload.role || 'user';
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

/**
 * Moderator-Check
 */
export function moderatorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  if (req.user.role !== 'MODERATOR' && req.user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 403);
  }

  next();
}

/**
 * Admin-Check
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new AppError('UNAUTHORIZED', 401);
  }

  if (req.user.role !== 'ADMIN') {
    throw new AppError('FORBIDDEN', 403);
  }

  next();
}
