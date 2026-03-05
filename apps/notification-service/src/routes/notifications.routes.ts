import { Router } from 'express';
import { notificationService } from '../services/notification.service';
import { emailService } from '../services/email.service';
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