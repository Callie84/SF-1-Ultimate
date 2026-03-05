// /apps/community-service/src/services/reply.service.ts
import { Reply, IReply } from '../models/Reply.model';
import { Thread } from '../models/Thread.model';
import { Category } from '../models/Category.model';
import { Ban } from '../models/Ban.model';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { gamificationHooks } from './gamification-hooks';
import { sendNotification } from './notification-client';

const MAX_DEPTH = 3;

export class ReplyService {
  /**
   * Reply erstellen
   */
  async create(userId: string, data: {
    threadId: string;
    content: string;
    parentId?: string;
  }): Promise<IReply> {
    // Ban-Check
    await this.checkBan(userId);
    
    // Thread existiert?
    const thread = await Thread.findById(data.threadId);
    if (!thread || thread.isDeleted) {
      throw new AppError('THREAD_NOT_FOUND', 404);
    }
    
    if (thread.isLocked) {
      throw new AppError('THREAD_LOCKED', 403);
    }
    
    // Depth-Check bei nested replies
    let depth = 0;
    if (data.parentId) {
      const parent = await Reply.findById(data.parentId);
      if (!parent) {
        throw new AppError('PARENT_NOT_FOUND', 404);
      }
      depth = parent.depth + 1;
      
      if (depth > MAX_DEPTH) {
        throw new AppError('MAX_DEPTH_EXCEEDED', 400);
      }
    }
    
    // Reply erstellen
    const reply = new Reply({
      threadId: data.threadId,
      userId,
      parentId: data.parentId,
      content: data.content.trim(),
      depth
    });
    
    await reply.save();
    
    // Thread-Counter + lastActivity
    await Thread.updateOne(
      { _id: data.threadId },
      { 
        $inc: { replyCount: 1 },
        lastActivityAt: new Date()
      }
    );
    
    // Category-Counter
    await Category.updateOne(
      { _id: thread.categoryId },
      { $inc: { postCount: 1 } }
    );
    
    // Gamification-Event
    await gamificationHooks.onReplyCreated(userId, reply._id.toString());

    // Notifications (fire-and-forget)
    const threadUrl = `/community/thread/${data.threadId}`;

    // Thread-Author benachrichtigen (nicht sich selbst)
    if (thread.userId && thread.userId !== userId) {
      sendNotification({
        userId: thread.userId,
        type: 'reply',
        title: 'Neue Antwort in deinem Thread',
        message: `Jemand hat auf deinen Thread „${thread.title}" geantwortet`,
        relatedUrl: threadUrl,
        relatedId: reply._id.toString(),
        relatedType: 'reply',
      });
    }

    // Parent-Reply-Author benachrichtigen bei Nested Reply
    if (data.parentId) {
      const parent = await Reply.findById(data.parentId).lean();
      if (parent && parent.userId && parent.userId !== userId && parent.userId !== thread.userId) {
        sendNotification({
          userId: parent.userId,
          type: 'reply',
          title: 'Jemand hat auf deine Antwort geantwortet',
          message: reply.content.substring(0, 100),
          relatedUrl: threadUrl,
          relatedId: reply._id.toString(),
          relatedType: 'reply',
        });
      }
    }

    // Notifications für Mentions
    if (reply.mentions.length > 0) {
      await this.notifyMentions(reply);
    }
    
    logger.info(`[Reply] Created ${reply._id} on thread ${data.threadId}`);
    
    return reply;
  }
  
  /**
   * Reply aktualisieren
   */
  async update(replyId: string, userId: string, content: string): Promise<IReply | null> {
    const reply = await Reply.findOne({ _id: replyId, userId });
    
    if (!reply) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    if (reply.isDeleted) {
      throw new AppError('REPLY_DELETED', 403);
    }
    
    reply.content = content.trim();
    reply.isEdited = true;
    reply.editedAt = new Date();
    
    await reply.save();
    
    return reply;
  }
  
  /**
   * Reply löschen (Soft-Delete)
   */
  async delete(replyId: string, userId: string, isModAction: boolean = false): Promise<void> {
    const reply = await Reply.findById(replyId);
    
    if (!reply) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    // Nur Owner oder Mod darf löschen
    if (!isModAction && reply.userId !== userId) {
      throw new AppError('FORBIDDEN', 403);
    }
    
    reply.isDeleted = true;
    reply.deletedAt = new Date();
    reply.deletedBy = userId;
    reply.content = '[deleted]';
    
    await reply.save();
    
    // Thread-Counter reduzieren
    await Thread.updateOne(
      { _id: reply.threadId },
      { $inc: { replyCount: -1 } }
    );
    
    // Category-Counter
    const thread = await Thread.findById(reply.threadId);
    if (thread) {
      await Category.updateOne(
        { _id: thread.categoryId },
        { $inc: { postCount: -1 } }
      );
    }
    
    logger.info(`[Reply] Deleted ${replyId} by ${userId} (mod: ${isModAction})`);
  }
  
  /**
   * Replies eines Threads abrufen
   */
  async getByThread(threadId: string, options: {
    sort?: 'best' | 'oldest' | 'newest';
    limit?: number;
    skip?: number;
  } = {}): Promise<{ replies: IReply[]; total: number }> {
    const query = { 
      threadId, 
      isDeleted: false,
      parentId: { $exists: false } // Nur Top-Level
    };
    
    let sort: any = {};
    switch (options.sort || 'best') {
      case 'best':
        sort = { isBestAnswer: -1, upvoteCount: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
    }
    
    const limit = Math.min(options.limit || 50, 200);
    const skip = options.skip || 0;
    
    const [replies, total] = await Promise.all([
      Reply.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Reply.countDocuments(query)
    ]);
    
    // Child-Replies laden
    const replyIds = replies.map(r => r._id.toString());
    const childReplies = await Reply.find({
      parentId: { $in: replyIds },
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .lean();
    
    // Zuordnen
    const repliesWithChildren = replies.map(reply => ({
      ...reply,
      replies: childReplies.filter(c => c.parentId === reply._id.toString())
    }));
    
    return { replies: repliesWithChildren as any, total };
  }
  
  /**
   * Ban-Check
   */
  private async checkBan(userId: string): Promise<void> {
    const ban = await Ban.findOne({ 
      userId, 
      isActive: true 
    });
    
    if (ban) {
      if (ban.type === 'permanent') {
        throw new AppError('USER_BANNED_PERMANENT', 403);
      }
      
      if (ban.expiresAt && ban.expiresAt > new Date()) {
        throw new AppError('USER_BANNED_TEMPORARY', 403);
      }
      
      ban.isActive = false;
      await ban.save();
    }
  }
  
  /**
   * Mentions benachrichtigen
   */
  private async notifyMentions(reply: IReply): Promise<void> {
    // mentions enthält userIds
    const threadUrl = `/community/thread/${reply.threadId}`;
    for (const mentionedUserId of reply.mentions) {
      if (mentionedUserId === reply.userId) continue;
      sendNotification({
        userId: mentionedUserId,
        type: 'mention',
        title: 'Du wurdest erwähnt',
        message: reply.content.substring(0, 100),
        relatedUrl: threadUrl,
        relatedId: reply._id.toString(),
        relatedType: 'reply',
      });
    }
  }
}

export const replyService = new ReplyService();
