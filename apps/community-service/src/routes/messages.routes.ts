// /apps/community-service/src/routes/messages.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/community/messages/conversations
 * Get all conversations for the current user
 */
router.get('/conversations', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await messageService.getConversations(userId, { skip, limit });

    res.json({
      conversations: result.conversations,
      total: result.total,
      hasMore: skip + result.conversations.length < result.total
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/messages/unread-count
 * Get total unread message count
 */
router.get('/unread-count', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const count = await messageService.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/messages/send
 * Send a message to a user
 */
router.post('/send', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    const result = await messageService.sendMessage(senderId, receiverId, content.trim());

    res.status(201).json({
      message: result.message,
      conversation: result.conversation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/community/messages/conversation/:conversationId
 * Get messages in a conversation
 */
router.get('/conversation/:conversationId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const result = await messageService.getMessages(conversationId, userId, { skip, limit });

    res.json({
      messages: result.messages,
      total: result.total,
      hasMore: skip + result.messages.length < result.total
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/messages/conversation/:conversationId/read
 * Mark all messages in conversation as read
 */
router.post('/conversation/:conversationId/read', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    await messageService.markAsRead(conversationId, userId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/community/messages/conversation/:conversationId
 * Delete a conversation (soft delete)
 */
router.delete('/conversation/:conversationId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    await messageService.deleteConversation(conversationId, userId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/community/messages/:messageId
 * Delete a message (soft delete)
 */
router.delete('/:messageId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;

    await messageService.deleteMessage(messageId, userId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/community/messages/start/:userId
 * Start or get a conversation with a user
 */
router.post('/start/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user!.id;
    const { userId: otherUserId } = req.params;

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    const conversation = await messageService.getOrCreateConversation(currentUserId, otherUserId);

    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

export default router;
