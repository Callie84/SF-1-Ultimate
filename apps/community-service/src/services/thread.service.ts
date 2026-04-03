// /apps/community-service/src/services/thread.service.ts
import { Thread, IThread } from '../models/Thread.model';
import { Reply } from '../models/Reply.model';
import { Category } from '../models/Category.model';
import { Ban } from '../models/Ban.model';
import { redis } from '../config/redis';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { gamificationHooks } from './gamification-hooks';
import { sanitizeHtml, stripHtml } from '../utils/sanitize';

export class ThreadService {
  /**
   * Thread erstellen
   */
  async create(userId: string, data: {
    categoryId: string;
    title: string;
    content: string;
    tags?: string[];
    imageUrls?: string[];
  }): Promise<IThread> {
    // Ban-Check
    await this.checkBan(userId);
    
    // Category existiert?
    const category = await Category.findById(data.categoryId);
    if (!category || !category.isActive) {
      throw new AppError('CATEGORY_NOT_FOUND', 404);
    }
    
    // Thread erstellen
    const thread = new Thread({
      userId,
      categoryId: data.categoryId,
      title: stripHtml(data.title.trim()),
      content: sanitizeHtml(data.content.trim()),
      tags: data.tags || [],
      imageUrls: (data.imageUrls || []).slice(0, 5),
      lastActivityAt: new Date()
    });
    
    await thread.save();
    
    // Category-Counter erhöhen
    await Category.updateOne(
      { _id: data.categoryId },
      { 
        $inc: { 
          threadCount: 1,
          postCount: 1
        } 
      }
    );
    
    // Gamification-Event
    await gamificationHooks.onThreadCreated(userId, thread._id.toString());
    
    logger.info(`[Thread] Created ${thread._id} by ${userId}`);
    
    return thread;
  }
  
  /**
   * Threads abrufen (Feed)
   */
  async getThreads(options: {
    categoryId?: string;
    userId?: string;
    sort?: 'latest' | 'trending' | 'top' | 'unanswered';
    limit?: number;
    skip?: number;
    tag?: string;
  }): Promise<{ threads: IThread[]; total: number }> {
    const query: any = { isDeleted: false };

    if (options.categoryId) {
      query.categoryId = String(options.categoryId);
    }

    if (options.userId) {
      query.userId = String(options.userId);
    }

    if (options.tag) {
      query.tags = String(options.tag);
    }
    
    const limit = Math.min(options.limit || 20, 100);
    const skip = options.skip || 0;
    
    // Sort
    let sort: any = {};
    switch (options.sort || 'latest') {
      case 'latest':
        sort = { isPinned: -1, lastActivityAt: -1 };
        break;
      case 'trending':
        // Trending = Viele Replies + Views in letzten 7 Tagen
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query.createdAt = { $gte: weekAgo };
        sort = { replyCount: -1, viewCount: -1 };
        break;
      case 'top':
        sort = { upvoteCount: -1, createdAt: -1 };
        break;
      case 'unanswered':
        query.replyCount = 0;
        sort = { createdAt: -1 };
        break;
    }
    
    const [threads, total] = await Promise.all([
      Thread.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Thread.countDocuments(query)
    ]);
    
    return { threads, total };
  }
  
  /**
   * Thread-Details
   */
  async getById(threadId: string, requestUserId?: string): Promise<any> {
    const thread = await Thread.findById(threadId).lean();
    
    if (!thread || thread.isDeleted) {
      throw new AppError('THREAD_NOT_FOUND', 404);
    }
    
    // View-Count erhöhen (nicht für eigenen Thread)
    if (requestUserId && thread.userId !== requestUserId) {
      await Thread.updateOne(
        { _id: threadId },
        { $inc: { viewCount: 1 } }
      );
    }
    
    // Replies laden
    const replies = await Reply.find({ 
      threadId, 
      isDeleted: false 
    })
      .sort({ isBestAnswer: -1, upvoteCount: -1, createdAt: 1 })
      .lean();
    
    // Nested-Replies strukturieren
    const replyMap = new Map(replies.map(r => [r._id.toString(), { ...r, replies: [] }]));
    const topLevelReplies: any[] = [];
    
    replies.forEach(reply => {
      const replyWithChildren = replyMap.get(reply._id.toString())!;
      
      if (reply.parentId) {
        const parent = replyMap.get(reply.parentId);
        if (parent) {
          parent.replies.push(replyWithChildren);
        }
      } else {
        topLevelReplies.push(replyWithChildren);
      }
    });
    
    return {
      ...thread,
      replies: topLevelReplies
    };
  }
  
  /**
   * Thread aktualisieren
   */
  async update(threadId: string, userId: string, data: {
    title?: string;
    content?: string;
    tags?: string[];
  }): Promise<IThread | null> {
    const thread = await Thread.findOne({ _id: threadId, userId });
    
    if (!thread) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    if (thread.isLocked) {
      throw new AppError('THREAD_LOCKED', 403);
    }
    
    if (data.title) thread.title = stripHtml(data.title.trim());
    if (data.content) thread.content = sanitizeHtml(data.content.trim());
    if (data.tags) thread.tags = data.tags;
    
    await thread.save();
    
    // Cache invalidieren
    await redis.del(`thread:${threadId}`);
    
    return thread;
  }
  
  /**
   * Thread löschen (Soft-Delete)
   */
  async delete(threadId: string, userId: string, isModAction: boolean = false): Promise<void> {
    const thread = await Thread.findById(threadId);
    
    if (!thread) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    // Nur Owner oder Mod darf löschen
    if (!isModAction && thread.userId !== userId) {
      throw new AppError('FORBIDDEN', 403);
    }
    
    thread.isDeleted = true;
    thread.deletedAt = new Date();
    thread.deletedBy = userId;
    
    await thread.save();
    
    // Category-Counter reduzieren
    await Category.updateOne(
      { _id: thread.categoryId },
      { 
        $inc: { 
          threadCount: -1,
          postCount: -(thread.replyCount + 1)
        } 
      }
    );
    
    logger.info(`[Thread] Deleted ${threadId} by ${userId} (mod: ${isModAction})`);
  }
  
  /**
   * Thread als gelöst markieren (Best Answer)
   */
  async markSolved(threadId: string, userId: string, replyId: string): Promise<void> {
    const thread = await Thread.findOne({ _id: threadId, userId });
    
    if (!thread) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    const reply = await Reply.findOne({ _id: replyId, threadId });
    
    if (!reply) {
      throw new AppError('REPLY_NOT_FOUND', 404);
    }
    
    // Altes Best Answer entfernen
    if (thread.bestAnswerId) {
      await Reply.updateOne(
        { _id: thread.bestAnswerId },
        { isBestAnswer: false }
      );
    }
    
    // Neues Best Answer setzen
    thread.isSolved = true;
    thread.bestAnswerId = replyId;
    await thread.save();
    
    reply.isBestAnswer = true;
    await reply.save();
    
    // Gamification-Event (für Reply-Autor)
    await gamificationHooks.onBestAnswerReceived(reply.userId, replyId);
    
    logger.info(`[Thread] ${threadId} solved with reply ${replyId}`);
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
      
      // Temporärer Ban abgelaufen
      ban.isActive = false;
      await ban.save();
    }
  }
  
  /**
   * Volltext-Suche
   */
  async search(query: string, options: {
    categoryId?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ threads: IThread[]; total: number }> {
    const searchQuery: any = {
      $text: { $search: query },
      isDeleted: false
    };
    
    if (options.categoryId) {
      searchQuery.categoryId = String(options.categoryId);
    }
    
    const limit = Math.min(options.limit || 20, 100);
    const skip = options.skip || 0;
    
    const [threads, total] = await Promise.all([
      Thread.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .lean(),
      Thread.countDocuments(searchQuery)
    ]);
    
    return { threads, total };
  }
}

export const threadService = new ThreadService();
