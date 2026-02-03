// Auth Middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // First check for X-User-Id header (from Traefik ForwardAuth)
    let userId = req.headers['x-user-id'] as string;
    let userRole = req.headers['x-user-role'] as string;
    let userPremium = req.headers['x-user-premium'] === 'true';

    // If no X-User-Id, try to extract from Authorization header (JWT)
    if (!userId) {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.replace('Bearer ', '').trim();

      if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
        userId = payload.userId;
        userRole = payload.role || 'user';
        userPremium = payload.premium || false;
      } catch (jwtError) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
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
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
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
