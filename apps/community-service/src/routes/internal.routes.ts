/**
 * SF-1 Ultimate - Community Service Internal Routes
 * ===================================================
 * Session 71: DSGVO — Datenexport & Account-Löschung
 * Gesichert via X-Internal-Secret Header
 */

import { Router, Request, Response } from 'express';
import { Thread } from '../models/Thread.model';
import { Reply } from '../models/Reply.model';
import { Follow } from '../models/Follow.model';
import { Conversation } from '../models/Conversation.model';
import { Message } from '../models/Message.model';

const router = Router();

function checkInternalSecret(req: Request, res: Response): boolean {
  const secret = req.headers['x-internal-secret'];
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * GET /api/community/internal/user-data/:userId
 * Exportiert alle Community-Daten eines Users (Threads, Replies)
 */
router.get('/user-data/:userId', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.params;
    const [threads, replies] = await Promise.all([
      Thread.find({ userId }).lean(),
      Reply.find({ userId }).lean(),
    ]);
    res.json({ threads, replies });
  } catch (error) {
    res.status(500).json({ error: 'Export fehlgeschlagen' });
  }
});

/**
 * POST /api/community/internal/anonymize-user
 * Anonymisiert alle Inhalte eines Users (Threads, Replies bleiben erhalten)
 * und löscht Follow-Beziehungen sowie Direktnachrichten
 */
router.post('/anonymize-user', async (req: Request, res: Response) => {
  if (!checkInternalSecret(req, res)) return;

  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId erforderlich' });
    }

    // Threads und Replies auf "Gelöschter Nutzer" anonymisieren
    await Promise.all([
      Thread.updateMany(
        { userId },
        { $set: { userId: 'deleted', username: 'Gelöschter Nutzer', displayName: 'Gelöschter Nutzer', avatar: null } }
      ),
      Reply.updateMany(
        { userId },
        { $set: { userId: 'deleted', username: 'Gelöschter Nutzer', displayName: 'Gelöschter Nutzer', avatar: null } }
      ),
      // Follow-Beziehungen löschen (als Follower und als Gefolgter)
      Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }),
    ]);

    // Conversations und Messages des Users löschen
    const conversations = await Conversation.find({
      participants: userId
    }).select('_id').lean();

    if (conversations.length > 0) {
      const convIds = conversations.map((c: any) => c._id);
      await Promise.all([
        Message.deleteMany({ conversationId: { $in: convIds } }),
        Conversation.deleteMany({ _id: { $in: convIds } }),
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[community-internal] anonymize-user error:', error);
    res.status(500).json({ error: 'Anonymisierung fehlgeschlagen' });
  }
});

export default router;
