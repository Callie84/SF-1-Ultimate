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
import { redis } from '../config/redis';
import multer from 'multer';
import { uploadAvatarToS3 } from '../config/s3';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype) as any);
  }
});

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
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 }).withMessage('Username muss 3-20 Zeichen lang sein')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username: nur Buchstaben, Zahlen, - und _ erlaubt'),
    body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
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

      const { email, password, username, displayName, name } = req.body;

      // Prüfe ob Email bereits existiert
      const existingEmail = await userService.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email bereits registriert' });
      }

      // Prüfe ob Username bereits existiert
      if (username) {
        const existingUsername = await userService.findByUsername(username);
        if (existingUsername) {
          return res.status(400).json({ error: 'Username bereits vergeben' });
        }
      }

      // Erstelle User
      const user = await userService.create({
        email,
        password,
        username: username || email.split('@')[0],
        name: displayName || name || username || email.split('@')[0],
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
          username: user.username,
          name: user.username,
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

      // 1 Account per IP Prüfung
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      if (clientIp !== 'unknown') {
        try {
          const existingUserId = await redis.get(`ip:login:${clientIp}`);
          if (existingUserId && existingUserId !== user.id) {
            return res.status(403).json({
              error: 'Von dieser IP-Adresse ist bereits ein anderer Account eingeloggt. Bitte logge dich zuerst aus.',
              code: 'IP_ALREADY_LOGGED_IN'
            });
          }
        } catch (e) {
          // Redis-Fehler ignorieren – fail-open
        }
      }

      // Generiere Tokens
      const accessToken = jwtService.generateAccessToken(user);

      const { token: refreshToken } = jwtService.generateRefreshToken(user.id);

      // Update Last-Login
      await userService.updateLastLogin(user.id);

      // IP → UserId Mapping in Redis speichern (7 Tage = Token-Laufzeit)
      if (clientIp !== 'unknown') {
        try {
          await redis.setEx(`ip:login:${clientIp}`, 7 * 24 * 60 * 60, user.id);
          await redis.setEx(`user:ip:${user.id}`, 7 * 24 * 60 * 60, clientIp);
        } catch (e) {
          // Redis-Fehler ignorieren
        }
      }

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
      username: (user as any).username || user.name || user.email.split('@')[0],
      displayName: user.name,
      bio: (user as any).bio || null,
      avatar: (user as any).avatar || null,
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
 * @route   GET /api/auth/users/:username
 * @desc    Get public user profile by username
 * @access  Public
 */
router.get('/users/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    // Find user by username (name field)
    const user = await userService.findByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    // Return only public profile data
    return res.status(200).json({
      id: user.id,
      username: user.name || user.email.split('@')[0],
      displayName: user.name,
      bio: user.bio || null,
      avatar: user.avatar || null,
      role: user.role,
      isVerified: user.emailVerified || false,
      createdAt: user.createdAt,
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Fehler beim Laden des Profils' });
  }
});

/**
 * @route   GET /api/auth/internal/user/:userId
 * @desc    Interne Route: User-Email für Notification-Service
 * @access  Internal (X-Internal-Secret)
 */
router.get('/internal/user/:userId', async (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret'];
  if (secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const user = await userService.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json({
      id: user.id,
      email: user.email,
      username: (user as any).username || (user as any).name || user.email.split('@')[0],
    });
  } catch {
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/users/by-id/:userId
 * @desc    Get public user info by userId (username + avatar)
 * @access  Public
 */
router.get('/users/by-id/:userId', async (req: Request, res: Response) => {
  try {
    const user = await userService.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    return res.json({
      id: user.id,
      username: (user as any).username || (user as any).name || (user as any).email?.split('@')[0] || 'Unbekannt',
      avatar: (user as any).avatar || null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Fehler beim Laden des Profils' });
  }
});

/**
 * @route   PATCH /api/auth/profile
 * @desc    Update user profile (bio, displayName, avatar)
 * @access  Private
 */
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwtService.verifyAccessToken(authHeader.replace('Bearer ', '').trim());
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });

    const { bio, displayName, avatar } = req.body;
    const user = await userService.updateProfile(payload.userId, { bio, displayName, avatar });

    return res.json({
      id: user.id,
      username: (user as any).username || (user as any).name,
      displayName: (user as any).name,
      bio: (user as any).bio || null,
      avatar: (user as any).avatar || null,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Fehler beim Speichern des Profils' });
  }
});

/**
 * @route   POST /api/auth/profile/avatar
 * @desc    Upload avatar image
 * @access  Private
 */
router.post('/profile/avatar', avatarUpload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwtService.verifyAccessToken(authHeader.replace('Bearer ', '').trim());
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const ext = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const avatarUrl = await uploadAvatarToS3(payload.userId, req.file.buffer, ext);
    await userService.updateProfile(payload.userId, { avatar: avatarUrl });

    return res.json({ avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ error: 'Fehler beim Hochladen des Avatars' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Initiates password reset — generates token stored in Redis (1h TTL)
 *          When SMTP is configured, sends reset email via notification-service
 * @access  Public
 */
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
      }

      const { email } = req.body;

      // Always return success to prevent email enumeration attacks
      const user = await userService.findByEmail(email);
      if (!user) {
        return res.status(200).json({ message: 'Wenn diese E-Mail registriert ist, wurde ein Reset-Link gesendet.' });
      }

      // Generate secure reset token
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const resetKey = `password_reset:${token}`;

      // Store in Redis with 1 hour TTL
      await redis.setEx(resetKey, 3600, user.id);

      // Build reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'https://seedfinderpro.de'}/auth/reset-password?token=${token}`;
      console.info(`[Auth] Password reset requested for ${email}. URL: ${resetUrl}`);

      // Send email via notification-service (fire-and-forget, don't block response)
      fetch('http://notification-service:3006/api/notifications/internal/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET || ''
        },
        body: JSON.stringify({
          to: email,
          subject: 'Passwort zurücksetzen — SeedFinderPro',
          template: 'password-reset',
          data: { resetUrl, username: user.username || user.email }
        })
      }).catch((err) => console.warn('[Auth] Email send failed:', err));

      return res.status(200).json({ message: 'Wenn diese E-Mail registriert ist, wurde ein Reset-Link gesendet.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: 'Fehler beim Passwort-Reset' });
    }
  }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Resets password using token from forgot-password flow
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token erforderlich'),
    body('password').isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen haben'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validierung fehlgeschlagen', details: errors.array() });
      }

      const { token, password } = req.body;
      const resetKey = `password_reset:${token}`;

      // Look up token in Redis
      const userId = await redis.get(resetKey);
      if (!userId) {
        return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Token' });
      }

      // Update password
      await userService.updatePassword(userId, password);

      // Delete token (single-use)
      await redis.del(resetKey);

      return res.status(200).json({ message: 'Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.' });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({ error: 'Fehler beim Passwort-Reset' });
    }
  }
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user (requires current password)
 * @access  Private (requires Bearer token)
 */
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Aktuelles Passwort erforderlich'),
    body('newPassword').isLength({ min: 8 }).withMessage('Neues Passwort muss mindestens 8 Zeichen haben'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validierung fehlgeschlagen', details: errors.array() });
      }

      // Verify auth token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Nicht autorisiert' });
      }
      const token = authHeader.replace('Bearer ', '').trim();
      const payload = jwtService.verifyAccessToken(token);
      if (!payload?.userId) {
        return res.status(401).json({ error: 'Ungültiger Token' });
      }

      const { currentPassword, newPassword } = req.body;

      // Fetch user and verify current password
      const user = await userService.findById(payload.userId);
      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' });
      }

      const isValid = await userService.verifyPassword(user, currentPassword);
      if (!isValid) {
        return res.status(400).json({ error: 'Aktuelles Passwort ist falsch' });
      }

      // Update password
      await userService.updatePassword(payload.userId, newPassword);

      return res.status(200).json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
    }
  }
);

/**
 * @route   GET /api/auth/users/:userId/email
 * @desc    Internal endpoint: Get user email by userId (for notification-service)
 * @access  Internal (X-Internal-Secret header required)
 */
router.get('/users/:userId/email', async (req: Request, res: Response) => {
  const secret = req.headers['x-internal-secret'];
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await userService.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ email: user.email, username: user.username });
  } catch (error) {
    console.error('Get user email error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (invalidiert Tokens - wenn Token-Blacklist implementiert)
 * @access  Public
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const payload = jwtService.verifyAccessToken(token);
      if (payload?.userId) {
        try {
          // IP-Mapping löschen beim Logout
          const userIp = await redis.get(`user:ip:${payload.userId}`);
          if (userIp) {
            await redis.del(`ip:login:${userIp}`);
          }
          await redis.del(`user:ip:${payload.userId}`);
        } catch (e) {
          // Redis-Fehler ignorieren
        }
      }
    }

    return res.status(200).json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
