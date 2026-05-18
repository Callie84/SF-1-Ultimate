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
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import multer from 'multer';
import { uploadAvatarToS3 } from '../config/s3';
import { checkBetaLimit } from '../utils/beta';
import { strictRateLimit } from '../middleware/rate-limit.middleware';
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllRefreshTokens, blacklistAccessToken, isAccessTokenBlacklisted } from '../services/token.service';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { createHash } from 'crypto';

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
 * Generiert einen 6-stelligen Verifizierungscode, speichert ihn in Redis
 * und sendet die Verifizierungs-E-Mail.
 * Speichert:
 *   email_verify_code:<userId> = code  (für erneute Anforderung)
 *   email_verify:<code>        = userId (für Verifizierung per Code)
 */
async function sendVerificationCode(userId: string, userEmail: string, username: string): Promise<void> {
  // 6-stelligen Code generieren (eindeutig in Redis)
  let code: string;
  let attempts = 0;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
  } while ((await redis.get(`email_verify:${code}`)) && attempts < 10);

  // Alten Code löschen falls vorhanden
  const oldCode = await redis.get(`email_verify_code:${userId}`);
  if (oldCode) await redis.del(`email_verify:${oldCode}`);

  // Neue Mappings speichern (24h TTL)
  await redis.setEx(`email_verify_code:${userId}`, 86400, code);
  await redis.setEx(`email_verify:${code}`, 86400, userId);

  const verifyUrl = `${process.env.FRONTEND_URL || 'https://seedfinderpro.de'}/auth/verify-email?code=${code}`;

  fetch(`${process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006'}/api/notifications/internal/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': process.env.INTERNAL_SECRET || '' },
    body: JSON.stringify({
      to: userEmail,
      subject: `Dein Verifizierungscode: ${code} – SeedFinderPro`,
      template: 'verify-email',
      data: { username, verifyCode: code, verifyUrl },
    }),
  }).catch((err) => console.warn('[Auth] Verification email failed:', err));
}

/**
 * @route   POST /api/auth/register
 * @desc    Registriert einen neuen User
 * @access  Public
 */
router.post(
  '/register',
  strictRateLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password muss mindestens 8 Zeichen haben'),
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 }).withMessage('Username muss 3-20 Zeichen lang sein')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username: nur Buchstaben, Zahlen, - und _ erlaubt'),
    body('displayName').optional().trim().isLength({ min: 2, max: 100 }),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('ageVerified').isBoolean().withMessage('Altersverifikation erforderlich')
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

      const { email, password, username, displayName, name, ageVerified } = req.body;

      // Altersverifikation prüfen
      if (!ageVerified) {
        return res.status(400).json({ error: 'Du musst mindestens 18 Jahre alt sein, um dich zu registrieren.' });
      }

      // Beta-Limit prüfen
      const beta = await checkBetaLimit();
      if (beta.blocked) {
        return res.status(403).json({ error: beta.message, code: 'BETA_FULL' });
      }

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
        role: 'user',
        ageVerified: ageVerified === true || ageVerified === 'true'
      });

      // Generiere Tokens
      const accessToken = jwtService.generateAccessToken(user);
      const { token: refreshToken } = await createRefreshToken(user.id);

      // Willkommens-E-Mail senden (fire-and-forget)
      fetch(`${process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006'}/api/notifications/internal/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.INTERNAL_SECRET || ''
        },
        body: JSON.stringify({
          to: email,
          subject: 'Willkommen bei SeedFinderPro!',
          template: 'welcome',
          data: { username: user.username || user.name || email.split('@')[0] }
        })
      }).catch((err) => console.warn('[Auth] Welcome email failed:', err));

      // Verifizierungs-E-Mail mit 6-stelligem Code senden (fire-and-forget)
      sendVerificationCode(user.id, email, user.username || user.name || email.split('@')[0]);

      return res.status(201).json({
        message: 'Registration erfolgreich',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.name,
          name: user.username,
          role: user.role,
          isVerified: user.isVerified || false,
          avatar: null,
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
  strictRateLimit,
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

      // IP-basiertes Rate-Limiting: max 10 Versuche pro 15 Minuten
      const clientIpForLimit = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
      const rateLimitKey = `login_attempts:${clientIpForLimit}`;
      try {
        const attempts = await redis.incr(rateLimitKey);
        if (attempts === 1) {
          await redis.expire(rateLimitKey, 15 * 60); // 15 Minuten TTL
        }
        if (attempts > 10) {
          const ttl = await redis.ttl(rateLimitKey);
          return res.status(429).json({
            error: 'Zu viele Login-Versuche. Bitte warte eine Weile.',
            retryAfter: ttl
          });
        }
      } catch (e) {
        // Redis-Fehler: fail-open
      }

      const { email, password } = req.body;

      // Account-Lockout prüfen (per E-Mail — unabhängig von IP)
      const accountLockKey = `account_lock:${email}`;
      const accountFailKey = `account_fails:${email}`;
      try {
        const locked = await redis.get(accountLockKey);
        if (locked) {
          const ttl = await redis.ttl(accountLockKey);
          return res.status(429).json({
            error: 'Account vorübergehend gesperrt. Zu viele fehlgeschlagene Logins.',
            code: 'ACCOUNT_LOCKED',
            retryAfter: ttl
          });
        }
      } catch (e) { /* fail-open */ }

      // Finde User
      const user = await userService.findByEmail(email);
      if (!user) {
        // Fehlversuch zählen (auch bei unbekannter E-Mail — verhindert User-Enumeration-Timing)
        try {
          const fails = await redis.incr(`account_fails:unknown`);
          if (fails === 1) await redis.expire(`account_fails:unknown`, 15 * 60);
        } catch (e) {}
        return res.status(401).json({ error: 'Ungültige Credentials' });
      }

      // Prüfe Password
      const isValidPassword = await userService.verifyPassword(user, password);
      if (!isValidPassword) {
        // Fehlversuch für diesen Account zählen
        try {
          const fails = await redis.incr(accountFailKey);
          if (fails === 1) await redis.expire(accountFailKey, 15 * 60);
          if (fails >= 10) {
            await redis.setEx(accountLockKey, 15 * 60, '1'); // 15min Sperre
            return res.status(429).json({
              error: 'Account vorübergehend gesperrt. 10 fehlgeschlagene Logins.',
              code: 'ACCOUNT_LOCKED',
              retryAfter: 900
            });
          }
        } catch (e) { /* fail-open */ }
        return res.status(401).json({ error: 'Ungültige Credentials' });
      }

      // Prüfe ob Account gesperrt oder deaktiviert
      if (user.isBanned) {
        return res.status(403).json({ error: 'Dein Account wurde gesperrt. Bitte kontaktiere den Support.', code: 'ACCOUNT_BANNED' });
      }
      if (user.isActive === false) {
        return res.status(403).json({ error: 'Dein Account ist deaktiviert.', code: 'ACCOUNT_INACTIVE' });
      }

      // Bei erfolgreichem Login: alle Rate-Limit-Counter zurücksetzen
      try {
        await redis.del(rateLimitKey);
        await redis.del(accountFailKey);
        await redis.del(accountLockKey);
      } catch (e) {}

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
      const { token: refreshToken } = await createRefreshToken(user.id);

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
          username: (user as any).username || user.name || user.email.split('@')[0],
          displayName: user.name,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified || false,
          avatar: (user as any).avatar || null,
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

    // 3. Blacklist prüfen (Token nach Logout widerrufen?)
    if (await isAccessTokenBlacklisted(token)) {
      return res.status(401).json({
        error: 'Token wurde widerrufen. Bitte erneut einloggen.',
        code: 'TOKEN_REVOKED'
      });
    }

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
router.post('/refresh', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // JWT-Signatur prüfen (schneller Vorab-Check ohne DB)
    const payload = jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // User laden
    const user = await userService.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // DB-backed Token Rotation mit Reuse-Detection
    const result = await rotateRefreshToken(refreshToken, user);

    if (!result) {
      // Token nicht in DB → möglicher Reuse-Angriff → Familie invalidiert
      return res.status(401).json({ error: 'Invalid or already used refresh token' });
    }

    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      message: 'Tokens refreshed successfully',
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
      displayName: (user as any).displayName || user.name,
      bio: (user as any).bio || null,
      avatar: (user as any).avatar || null,
      role: user.role,
      isVerified: user.isVerified || false,
      totpEnabled: (user as any).totpEnabled || false,
      privacy: {
        profilePublic: (user as any).profilePublic ?? true,
        showEmail: (user as any).showEmail ?? false,
        showGrows: (user as any).showGrows ?? true,
      },
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
      isVerified: user.isVerified || false,
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

    const { bio, displayName, avatar, privacy } = req.body;

    const updateData: any = {};
    if (bio !== undefined) updateData.bio = bio;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (privacy) {
      if (privacy.profilePublic !== undefined) updateData.profilePublic = privacy.profilePublic;
      if (privacy.showEmail !== undefined) updateData.showEmail = privacy.showEmail;
      if (privacy.showGrows !== undefined) updateData.showGrows = privacy.showGrows;
    }

    const user = await userService.updateProfile(payload.userId, updateData);

    return res.json({
      id: user.id,
      username: (user as any).username || (user as any).name,
      displayName: (user as any).displayName || (user as any).name,
      bio: (user as any).bio || null,
      avatar: (user as any).avatar || null,
      privacy: {
        profilePublic: (user as any).profilePublic ?? true,
        showEmail: (user as any).showEmail ?? false,
        showGrows: (user as any).showGrows ?? true,
      },
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
  strictRateLimit,
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
  strictRateLimit,
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
    const { refreshToken } = req.body;

    // Refresh Token aus DB löschen (falls übergeben)
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Access Token blacklisten + IP-Mapping bereinigen
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const payload = jwtService.verifyAccessToken(token);
      if (payload?.userId) {
        // Token auf Blacklist setzen (läuft automatisch nach verbleibender TTL ab)
        if (payload.exp) {
          await blacklistAccessToken(token, payload.exp);
        }
        // IP-Mapping bereinigen
        try {
          const userIp = await redis.get(`user:ip:${payload.userId}`);
          if (userIp) await redis.del(`ip:login:${userIp}`);
          await redis.del(`user:ip:${payload.userId}`);
        } catch (e) {
          // Redis-Fehler ignorieren
        }
      }
    }

    return res.status(200).json({
      message: 'Logout successful',
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * @route   POST /api/auth/send-verification-email
 * @desc    Sendet Verifizierungs-E-Mail (erneut)
 * @access  Private (Bearer token)
 */
router.post('/send-verification-email', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    const user = await userService.findById(payload.userId);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (user.isVerified) return res.status(400).json({ error: 'E-Mail bereits verifiziert' });

    // Rate-limit: max 1 Anfrage pro 2 Minuten
    const rateLimitKey = `email_verify_rate:${user.id}`;
    const existing = await redis.get(rateLimitKey);
    if (existing) {
      return res.status(429).json({ error: 'Bitte warte 2 Minuten bevor du einen neuen Code anforderst' });
    }
    await redis.setEx(rateLimitKey, 120, '1');

    // 6-stelligen Code generieren und E-Mail senden
    await sendVerificationCode(user.id, user.email, (user as any).username || user.name || user.email.split('@')[0]);

    return res.json({ message: 'Verifizierungscode gesendet' });
  } catch (error) {
    console.error('Send verification email error:', error);
    return res.status(500).json({ error: 'Fehler beim Senden' });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    E-Mail verifizieren mit Token
 * @access  Public
 */
router.post('/verify-email', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code fehlt' });

    // 6-stelligen Code nachschlagen
    const cleanCode = String(code).replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      return res.status(400).json({ error: 'Code muss 6 Ziffern haben' });
    }

    const userId = await redis.get(`email_verify:${cleanCode}`);
    if (!userId) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Code' });
    }

    // User als verifiziert markieren
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    // Code aus Redis löschen
    await redis.del(`email_verify:${cleanCode}`);
    await redis.del(`email_verify_code:${userId}`);

    return res.json({ message: 'E-Mail erfolgreich verifiziert' });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ error: 'Verifizierung fehlgeschlagen' });
  }
});

/**
 * @route   GET /api/auth/google
 * @desc    Leitet zu Google OAuth weiter
 * @access  Public
 */
router.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth nicht konfiguriert' });
  }
  const redirectUri = `${process.env.FRONTEND_URL || 'https://seedfinderpro.de'}/api/auth/callback/google`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * @route   GET /api/auth/callback/google
 * @desc    Google OAuth Callback — tauscht Code gegen Token, legt User an/loggt ein
 * @access  Public
 */
router.get('/callback/google', async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://seedfinderpro.de';
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${frontendUrl}/auth/login?error=oauth_cancelled`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${frontendUrl}/api/auth/callback/google`;

    // 1. Code gegen Access-Token tauschen
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      console.error('[OAuth] Token exchange failed:', await tokenResponse.text());
      return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
    }

    const tokenData = await tokenResponse.json() as any;

    // 2. User-Profil von Google holen
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
    }

    const profile = await profileResponse.json() as any;
    const { id: googleId, email, name, picture } = profile;

    if (!email) {
      return res.redirect(`${frontendUrl}/auth/login?error=oauth_no_email`);
    }

    // 3. User suchen: erst nach providerId, dann nach Email
    let user = await prisma.user.findFirst({
      where: { provider: 'GOOGLE', providerId: googleId }
    });

    if (!user) {
      // User mit dieser Email schon vorhanden? Account verknüpfen (kein neuer Slot nötig)
      user = await userService.findByEmail(email);
      if (user) {
        // Existierenden User mit Google verknüpfen
        user = await prisma.user.update({
          where: { id: user.id },
          data: { provider: 'GOOGLE', providerId: googleId, isVerified: true }
        });
      } else {
        // Neuer User → Beta-Limit prüfen
        const beta = await checkBetaLimit();
        if (beta.blocked) {
          return res.redirect(`${frontendUrl}/auth/login?error=beta_full`);
        }

        // Neuen User anlegen
        let username = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
        // Username-Kollision vermeiden
        const existing = await userService.findByUsername(username);
        if (existing) {
          username = `${username}_${Math.floor(Math.random() * 9000) + 1000}`;
        }

        const crypto = await import('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');

        user = await userService.create({
          email,
          password: randomPassword,
          username,
          name: name || username,
          provider: 'GOOGLE',
          providerId: googleId,
          isVerified: true,
          avatar: picture || undefined,
        });
      }
    }

    // 4. JWT generieren
    const accessToken = jwtService.generateAccessToken(user);
    const { token: refreshToken } = await createRefreshToken(user.id);

    // 5. Redirect zur Frontend-Callback-Seite mit Tokens
    return res.redirect(
      `${frontendUrl}/auth/oauth-callback?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`
    );
  } catch (err) {
    console.error('[OAuth] Google callback error:', err);
    return res.redirect(`${frontendUrl}/auth/login?error=oauth_failed`);
  }
});

// ============================================================
// SEC-7: 2FA / TOTP Routes
// ============================================================

/**
 * @route   POST /api/auth/2fa/setup
 * @desc    Generiert TOTP-Secret + QR-Code (noch nicht aktiviert)
 * @access  Authenticated
 */
router.post('/2fa/setup', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Ungültiger Token' });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    if (user.totpEnabled) {
      return res.status(400).json({ error: '2FA ist bereits aktiviert' });
    }

    // Neuen Secret generieren
    const secret = speakeasy.generateSecret({
      name: `SeedfinderPro (${user.email})`,
      issuer: 'SeedfinderPro',
      length: 20
    });

    // Secret temporär in Redis speichern (10 Minuten zum Setup)
    await redis.setEx(`totp_setup:${user.id}`, 10 * 60, secret.base32);

    // QR-Code generieren
    const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return res.status(200).json({
      secret: secret.base32,
      qrCode: qrDataUrl,
      message: 'Scanne den QR-Code mit deiner Authenticator-App und bestätige dann mit /2fa/enable'
    });
  } catch (err) {
    console.error('[2FA] Setup error:', err);
    return res.status(500).json({ error: '2FA-Setup fehlgeschlagen' });
  }
});

/**
 * @route   POST /api/auth/2fa/enable
 * @desc    Aktiviert 2FA nach Bestätigung mit TOTP-Code
 * @access  Authenticated
 */
router.post('/2fa/enable', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Ungültiger Token' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'TOTP-Code fehlt' });

    // Temporären Secret aus Redis holen
    const tempSecret = await redis.get(`totp_setup:${payload.userId}`);
    if (!tempSecret) {
      return res.status(400).json({ error: 'Setup-Session abgelaufen. Bitte starte Setup neu.' });
    }

    // Code verifizieren
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Ungültiger TOTP-Code' });
    }

    // Backup-Codes generieren (8 Codes, jeweils 8 Zeichen)
    const backupCodes: string[] = [];
    const hashedBackupCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = require('crypto').randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      hashedBackupCodes.push(createHash('sha256').update(code).digest('hex'));
    }

    // 2FA aktivieren in DB
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        totpSecret: tempSecret,
        totpEnabled: true,
        totpBackupCodes: hashedBackupCodes
      }
    });

    // Temp-Secret aus Redis löschen
    await redis.del(`totp_setup:${payload.userId}`);

    return res.status(200).json({
      message: '2FA erfolgreich aktiviert',
      backupCodes,
      warning: 'Speichere diese Backup-Codes sicher! Sie werden nur einmal angezeigt.'
    });
  } catch (err) {
    console.error('[2FA] Enable error:', err);
    return res.status(500).json({ error: '2FA-Aktivierung fehlgeschlagen' });
  }
});

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Deaktiviert 2FA (erfordert TOTP-Code zur Bestätigung)
 * @access  Authenticated
 */
router.post('/2fa/disable', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Ungültiger Token' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'TOTP-Code fehlt' });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ error: '2FA ist nicht aktiviert' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ error: 'Ungültiger TOTP-Code' });
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: []
      }
    });

    return res.status(200).json({ message: '2FA erfolgreich deaktiviert' });
  } catch (err) {
    console.error('[2FA] Disable error:', err);
    return res.status(500).json({ error: '2FA-Deaktivierung fehlgeschlagen' });
  }
});

/**
 * @route   POST /api/auth/2fa/login
 * @desc    Schließt Login mit TOTP-Code ab (nach mfa_required Response)
 * @access  Public (mit mfa_token)
 */
router.post('/2fa/login', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { mfa_token, code } = req.body;
    if (!mfa_token || !code) {
      return res.status(400).json({ error: 'mfa_token und code erforderlich' });
    }

    // UserId aus Redis holen
    const userId = await redis.get(`mfa_pending:${mfa_token}`);
    if (!userId) {
      return res.status(400).json({ error: 'MFA-Session abgelaufen oder ungültig. Bitte erneut einloggen.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ error: 'User oder 2FA nicht gefunden' });
    }

    // TOTP-Code prüfen
    let verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1
    });

    // Falls TOTP nicht passt: Backup-Code prüfen
    if (!verified && user.totpBackupCodes.length > 0) {
      const codeHash = createHash('sha256').update(code.toUpperCase()).digest('hex');
      const idx = user.totpBackupCodes.indexOf(codeHash);
      if (idx !== -1) {
        verified = true;
        // Backup-Code verbrauchen
        const remainingCodes = [...user.totpBackupCodes];
        remainingCodes.splice(idx, 1);
        await prisma.user.update({
          where: { id: userId },
          data: { totpBackupCodes: remainingCodes }
        });
      }
    }

    if (!verified) {
      return res.status(401).json({ error: 'Ungültiger TOTP-Code' });
    }

    // MFA-Pending-Token löschen
    await redis.del(`mfa_pending:${mfa_token}`);

    // Tokens ausstellen
    const accessToken = jwtService.generateAccessToken(user);
    const { token: refreshToken } = await createRefreshToken(user.id);
    await userService.updateLastLogin(user.id);

    return res.status(200).json({
      message: 'Login erfolgreich',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: (user as any).username || user.email.split('@')[0],
        displayName: user.name,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified || false,
        avatar: (user as any).avatar || null,
      }
    });
  } catch (err) {
    console.error('[2FA] Login error:', err);
    return res.status(500).json({ error: '2FA-Login fehlgeschlagen' });
  }
});

/**
 * @route   GET /api/auth/2fa/status
 * @desc    Gibt 2FA-Status des aktuellen Users zurück
 * @access  Authenticated
 */
router.get('/2fa/status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Ungültiger Token' });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { totpEnabled: true, totpBackupCodes: true }
    });

    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    return res.status(200).json({
      enabled: user.totpEnabled,
      backupCodesRemaining: user.totpBackupCodes.length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Status-Abfrage fehlgeschlagen' });
  }
});

/**
 * @route   POST /api/auth/admin/unlock
 * @desc    Verifiziert TOTP und gibt Admin-Session-Token zurück (Step-up Auth)
 * @access  Authenticated + ADMIN role
 */
router.post('/admin/unlock', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Admins' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'TOTP-Code erforderlich' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { totpEnabled: true, totpSecret: true, totpBackupCodes: true }
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return res.status(400).json({ error: '2FA nicht aktiviert' });
    }

    // TOTP prüfen
    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });

    if (!valid) {
      // Backup-Code prüfen
      const hashedInput = createHash('sha256').update(code.replace(/\s/g, '').toUpperCase()).digest('hex');
      const backupIndex = user.totpBackupCodes.findIndex(h => h === hashedInput);
      if (backupIndex === -1) {
        return res.status(401).json({ error: 'Ungültiger Code' });
      }
      // Backup-Code verbrauchen
      const updatedCodes = [...user.totpBackupCodes];
      updatedCodes.splice(backupIndex, 1);
      await prisma.user.update({
        where: { id: payload.userId },
        data: { totpBackupCodes: updatedCodes }
      });
    }

    // Admin-Session-Token (8h gültig)
    const adminSessionToken = require('crypto').randomBytes(32).toString('hex');
    await redis.setEx(`admin_session:${adminSessionToken}`, 8 * 60 * 60, payload.userId);

    return res.status(200).json({ adminSessionToken });
  } catch (err) {
    return res.status(500).json({ error: 'Admin-Unlock fehlgeschlagen' });
  }
});

/**
 * @route   GET /api/auth/export-data
 * @desc    DSGVO-Datenexport — alle User-Daten als JSON-Download
 * @access  Authenticated
 */
router.get('/export-data', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwtService.verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true, email: true, username: true, displayName: true, bio: true,
        avatar: true, role: true, provider: true, isVerified: true,
        profilePublic: true, showEmail: true, showGrows: true,
        ageVerified: true, createdAt: true, updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    const internalHeaders = {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_SECRET || '',
    };

    // Daten von allen Services parallel abrufen
    const [journalData, communityData, gamificationData] = await Promise.allSettled([
      fetch(`${process.env.JOURNAL_SERVICE_URL || 'http://sf1-journal-service:3003'}/api/journal/internal/user-data/${user.id}`, { headers: internalHeaders }).then(r => r.json()),
      fetch(`${process.env.COMMUNITY_SERVICE_URL || 'http://sf1-community-service:3005'}/api/community/internal/user-data/${user.id}`, { headers: internalHeaders }).then(r => r.json()),
      fetch(`${process.env.GAMIFICATION_SERVICE_URL || 'http://sf1-gamification-service:3009'}/api/gamification/internal/user-data/${user.id}`, { headers: internalHeaders }).then(r => r.json()),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user,
      journal: journalData.status === 'fulfilled' ? journalData.value : null,
      community: communityData.status === 'fulfilled' ? communityData.value : null,
      gamification: gamificationData.status === 'fulfilled' ? gamificationData.value : null,
    };

    const filename = `sf1-datenexport-${user.username || user.id}-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(exportData);

  } catch (error) {
    console.error('[Auth] export-data error:', error);
    return res.status(500).json({ error: 'Datenexport fehlgeschlagen' });
  }
});

/**
 * @route   DELETE /api/auth/account
 * @desc    DSGVO-Account-Löschung — löscht alle User-Daten aus allen Services
 * @access  Authenticated (Passwort-Bestätigung erforderlich)
 */
router.delete(
  '/account',
  [body('password').notEmpty().withMessage('Passwort erforderlich')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validierung fehlgeschlagen', details: errors.array() });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Nicht autorisiert' });
      }
      const token = authHeader.replace('Bearer ', '').trim();
      const payload = jwtService.verifyAccessToken(token);
      if (!payload) {
        return res.status(401).json({ error: 'Ungültiger Token' });
      }

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        return res.status(404).json({ error: 'User nicht gefunden' });
      }

      // Passwort prüfen (OAuth-User haben kein Passwort → direkt erlauben)
      if (user.passwordHash) {
        const { userService } = await import('../services/user.service');
        const valid = await userService.verifyPassword(user, req.body.password);
        if (!valid) {
          return res.status(401).json({ error: 'Falsches Passwort' });
        }
      }

      const internalHeaders = {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_SECRET || '',
      };

      // Daten in allen Services löschen / anonymisieren (parallel, Fehler ignorieren)
      await Promise.allSettled([
        fetch(`${process.env.JOURNAL_SERVICE_URL || 'http://sf1-journal-service:3003'}/api/journal/internal/user-data/${user.id}`, { method: 'DELETE', headers: internalHeaders }),
        fetch(`${process.env.COMMUNITY_SERVICE_URL || 'http://sf1-community-service:3005'}/api/community/internal/anonymize-user`, {
          method: 'POST', headers: internalHeaders, body: JSON.stringify({ userId: user.id })
        }),
        fetch(`${process.env.GAMIFICATION_SERVICE_URL || 'http://sf1-gamification-service:3009'}/api/gamification/internal/user-data/${user.id}`, { method: 'DELETE', headers: internalHeaders }),
        fetch(`${process.env.NOTIFICATION_SERVICE_URL || 'http://sf1-notification-service:3006'}/api/notifications/internal/user-data/${user.id}`, { method: 'DELETE', headers: internalHeaders }),
      ]);

      // Alle Tokens und Sessions widerrufen
      await revokeAllRefreshTokens(user.id);

      // User aus PostgreSQL löschen (cascaded: Sessions, RefreshTokens)
      await prisma.user.delete({ where: { id: user.id } });

      // Bestätigungs-E-Mail senden (fire-and-forget)
      fetch(`${process.env.NOTIFICATION_SERVICE_URL || 'http://sf1-notification-service:3006'}/api/notifications/internal/email`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          to: user.email,
          subject: 'Dein Account wurde gelöscht',
          template: 'account-deleted',
          data: { username: user.username || user.email }
        })
      }).catch(() => {});

      return res.status(200).json({ message: 'Account wurde vollständig gelöscht.' });

    } catch (error) {
      console.error('[Auth] delete-account error:', error);
      return res.status(500).json({ error: 'Account-Löschung fehlgeschlagen' });
    }
  }
);

/**
 * @route   PUT /api/auth/onboarding
 * @desc    Onboarding-Fortschritt speichern (step + completed-Flag)
 */
router.put('/onboarding', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Nicht angemeldet' });

    const payload = jwtService.verify(token) as any;
    if (!payload?.userId) return res.status(401).json({ error: 'Ungültiger Token' });

    const { step, completed } = req.body;

    const updateData: any = {};
    if (typeof step === 'number') updateData.onboardingStep = step;
    if (typeof completed === 'boolean') updateData.onboardingCompleted = completed;

    await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[Auth] onboarding error:', error);
    return res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

/**
 * @route   GET /api/auth/onboarding
 * @desc    Onboarding-Status abrufen
 */
router.get('/onboarding', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Nicht angemeldet' });

    const payload = jwtService.verify(token) as any;
    if (!payload?.userId) return res.status(401).json({ error: 'Ungültiger Token' });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { onboardingCompleted: true, onboardingStep: true },
    });

    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Fehler' });
  }
});

export default router;

