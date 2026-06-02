// Auth Service - JWT Service
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { User } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  premium: boolean;
  exp?: number;
}

export class JWTService {
  /**
   * Generate Access Token (15min)
   */
  generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      premium: user.premiumUntil ? user.premiumUntil > new Date() : false
    };
    
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: '15m',
      issuer: 'sf1-auth'
    });
  }
  
  /**
   * Generate Refresh Token (7d)
   */
  generateRefreshToken(userId: string, family?: string): { token: string; family: string } {
    const tokenFamily = family || nanoid();
    
    const token = jwt.sign(
      { userId, family: tokenFamily },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { token, family: tokenFamily };
  }
  
  /**
   * Verify Access Token
   */
  verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return null;
    }
  }
  
  /**
   * Verify Refresh Token
   */
  verifyRefreshToken(token: string): { userId: string; family: string } | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; family: string };
    } catch {
      return null;
    }
  }
}

export const jwtService = new JWTService();
