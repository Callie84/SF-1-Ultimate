import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || '';

interface AuthUser {
  id: string;
  role: string;
  premium: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Option 1: Traefik headers (wenn ForwardAuth aktiv)
    if (req.headers['x-forwarded-for'] && req.headers['x-user-id']) {
      const userId = req.headers['x-user-id'] as string;
      if (!userId || userId.trim() === '') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      req.user = {
        id: userId,
        role: (req.headers['x-user-role'] as string) || 'user',
        premium: req.headers['x-user-premium'] === 'true',
      };
      return next();
    }

    // Option 2: Direktes JWT Bearer Token
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

    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    if (!payload.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = {
      id: payload.userId,
      role: payload.role || 'user',
      premium: false,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Option 1: Traefik headers
    if (req.headers['x-forwarded-for'] && req.headers['x-user-id']) {
      const userId = req.headers['x-user-id'] as string;
      if (userId && userId.trim() !== '') {
        req.user = {
          id: userId,
          role: (req.headers['x-user-role'] as string) || 'user',
          premium: req.headers['x-user-premium'] === 'true',
        };
      }
      return next();
    }

    // Option 2: Direktes JWT Bearer Token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      try {
        const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
        if (payload.userId) {
          req.user = {
            id: payload.userId,
            role: payload.role || 'user',
            premium: false,
          };
        }
      } catch {
        // Ungültiger Token → User bleibt undefined
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
