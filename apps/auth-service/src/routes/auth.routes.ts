/**
 * SF-1 Ultimate - Auth Service Routes
 * ====================================
 * 
 * Datei: auth.routes.ts
 * Speicherort: /SF-1-Ultimate/auth-service/src/routes/
 * Service: auth-service (Port 3001)
 * 
 * Implementiert alle Authentication-Endpoints inklusive /verify für Traefik
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { jwtService } from '../services/jwt.service';
import { userService } from '../services/user.service';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registriert einen neuen User
 * @access  Public
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password muss mindestens 8 Zeichen haben'),
    body('name').optional().trim().isLength({ min: 2, max: 100 })
  ],
  async (req: Request, res: Response) => {
    try {
      // Validierung
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validierung fehlgeschlagen',
          details: errors.array() 
        });
      }

      const { email, password, name } = req.body;

      // Prüfe ob User bereits existiert
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email bereits registriert' });
      }

      // Erstelle User
      const user = await userService.create({
        email,
        password,
        name: name || email.split('@')[0],
        role: 'user'
      });

      // Generiere Tokens
      const accessToken = jwtService.generateAccessToken(user);

      const { token: refreshToken } = jwtService.generateRefreshToken(user.id);

      return res.status(201).json({
        message: 'Registration erfolgreich',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    User-Login mit Email/Password
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validierung
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validierung fehlgeschlagen',
          details: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Finde User
      const user = await userService.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Ungültige Credentials' });
      }

      // Prüfe Password
      const isValidPassword = await userService.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Ungültige Credentials' });
      }

      // Generiere Tokens
      const accessToken = jwtService.generateAccessToken(user);

      const { token: refreshToken } = jwtService.generateRefreshToken(user.id);

      // Update Last-Login
      await userService.updateLastLogin(user.id);

      return res.status(200).json({
        message: 'Login erfolgreich',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login fehlgeschlagen' });
    }
  }
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verifiziert JWT Token (wird von Traefik aufgerufen)
 * @access  Public
 * @returns X-User-Id, X-User-Role, X-User-Email Headers bei Erfolg
 * 
 * KRITISCH: Dieser Endpoint wird von Traefik's ForwardAuth Middleware
 * bei JEDEM Request zu geschützten Services aufgerufen!
 * 
 * Flow:
 * 1. User → Request mit Bearer Token → Traefik
 * 2. Traefik → /api/auth/verify (mit Token) → Auth-Service
 * 3. Auth-Service → Verifiziert Token → Setzt X-User-* Headers
 * 4. Traefik → Forwarded Request (mit Headers) → Target-Service
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    // 1. Extract Token from Authorization Header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Missing Authorization header',
        code: 'NO_AUTH_HEADER'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Invalid Authorization format. Expected: Bearer <token>',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token || token.length === 0) {
      return res.status(401).json({ 
        error: 'Empty token provided',
        code: 'EMPTY_TOKEN'
      });
    }

    // 2. Verify JWT
    const payload = jwtService.verifyAccessToken(token);
    
    if (!payload) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // 3. Optional: Prüfe ob User noch existiert (für erhöhte Sicherheit)
    // const user = await userService.findById(payload.userId);
    // if (!user) {
    //   return res.status(401).json({ 
    //     error: 'User not found',
    //     code: 'USER_NOT_FOUND'
    //   });
    // }

    // 4. Set Headers für Traefik zum Forwarden
    res.set('X-User-Id', payload.userId);
    res.set('X-User-Role', payload.role || 'user');
    res.set('X-User-Email', payload.email || '');

    // 5. Return Success (Body wird von Traefik ignoriert, nur Headers zählen!)
    return res.status(200).json({ 
      valid: true,
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      message: 'Token successfully verified'
    });

  } catch (error) {
    console.error('Token verification failed:', error);
    
    // Detaillierte Fehler-Info (nur in Development)
    if (process.env.NODE_ENV === 'development') {
      return res.status(401).json({ 
        error: 'Token verification failed',
        code: 'VERIFICATION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return res.status(401).json({ 
      error: 'Token verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Erneuert Access-Token mit Refresh-Token
 * @access  Public
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify Refresh Token
    const payload = jwtService.verifyRefreshToken(refreshToken);
    
    if (!payload) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Hole User-Daten
    const user = await userService.findById(payload.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generiere neue Tokens (Token Rotation für erhöhte Sicherheit)
    const newAccessToken = jwtService.generateAccessToken(user);
    const { token: newRefreshToken } = jwtService.generateRefreshToken(user.id);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: 'Tokens refreshed successfully'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private (requires valid token)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Verify token
    const payload = jwtService.verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database
    const user = await userService.findById(payload.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      username: user.name || user.email.split('@')[0],
      displayName: user.name,
      role: user.role,
      isVerified: user.emailVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (invalidiert Tokens - wenn Token-Blacklist implementiert)
 * @access  Public
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // TODO: Implement Token Blacklisting in Redis
    // const token = req.headers.authorization?.replace('Bearer ', '');
    // await redis.setex(`blacklist:${token}`, 900, 'true'); // 15min TTL

    return res.status(200).json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
