import { Router } from 'express';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
import { pushService } from '../services/push.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications
 */
router.get('/',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { limit, skip, unreadOnly } = req.query;
      
      const result = await notificationService.getForUser(req.user!.id, {
        limit: parseInt(limit as string) || 50,
        skip: parseInt(skip as string) || 0,
        unreadOnly: unreadOnly === 'true'
      });
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/notifications/unread-count
 * Get unread count
 */
router.get('/unread-count',
  authMiddleware,
  async (req, res, next) => {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/notifications/:id/read
 * Mark as read
 */
router.patch('/:id/read',
  authMiddleware,
  async (req, res, next) => {
    try {
      await notificationService.markAsRead(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/notifications/read-all
 * Mark all as read
 */
router.post('/read-all',
  authMiddleware,
  async (req, res, next) => {
    try {
      await notificationService.markAllAsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await notificationService.deleteNotification(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/notifications/internal/email
 * Internal endpoint for other services to send transactional emails.
 * Requires X-Internal-Secret header.
 */
router.post('/internal/email', async (req, res, next) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { to, subject, template, data } = req.body;
    if (!to || !subject || !template) {
      return res.status(400).json({ error: 'to, subject, template required' });
    }

    const success = await emailService.send({ to, subject, template, data: data || {} });
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/admin/test-email
 * Admin: Test-E-Mail senden
 */
router.post('/admin/test-email', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'sf1-super-secret-jwt-key-change-in-production';
    let payload: any;
    try {
      payload = jwt.default.verify(authHeader.replace('Bearer ', '').trim(), secret);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { to, template = 'welcome' } = req.body;
    if (!to) return res.status(400).json({ error: 'to required' });

    const success = await emailService.send({
      to,
      subject: `[Test] SeedFinderPro E-Mail — ${template}`,
      template,
      data: {
        username: 'Test-User',
        resetUrl: 'https://seedfinderpro.de/auth/reset-password?token=test-token-123'
      }
    });

    res.json({ success, to, template });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/contact
 * Public: Kontaktformular — sendet E-Mail an Admin
 */
router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, E-Mail und Nachricht sind erforderlich' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }
    if (message.length < 10) {
      return res.status(400).json({ error: 'Nachricht zu kurz' });
    }
    const success = await emailService.sendContactForm({ name, email, subject, message });
    if (!success) {
      return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/push/vapid-key
 * Öffentlicher VAPID Public Key für den Browser
 */
router.get('/push/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ vapidPublicKey: key });
});

/**
 * POST /api/notifications/push/subscribe
 * Web Push Subscription registrieren
 */
router.post('/push/subscribe',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { subscription } = req.body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription object' });
      }

      await pushService.registerDevice(req.user!.id, {
        token: subscription.endpoint, // endpoint als eindeutiger Token
        platform: 'web',
        webPushSubscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/notifications/push/subscribe
 * Web Push Subscription entfernen
 */
router.delete('/push/subscribe',
  authMiddleware,
  async (req, res, next) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await pushService.unregisterDevice(endpoint);
      } else {
        await pushService.unregisterAllWebPush(req.user!.id);
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/notifications/internal/create
 * Internal endpoint for other services to create in-app notifications.
 * Requires X-Internal-Secret header.
 */
router.post('/internal/create', async (req, res, next) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId, title, message, type = 'system' } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, message required' });
    }

    await notificationService.create({ userId, type, title, message });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;