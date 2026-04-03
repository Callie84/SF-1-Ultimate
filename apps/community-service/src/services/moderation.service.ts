// /apps/community-service/src/services/moderation.service.ts
import { Report, IReport } from '../models/Report.model';
import { Ban, IBan } from '../models/Ban.model';
import { Thread } from '../models/Thread.model';
import { Reply } from '../models/Reply.model';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { threadService } from './thread.service';
import { replyService } from './reply.service';

export class ModerationService {
  /**
   * Content melden
   */
  async report(reporterId: string, data: {
    targetId: string;
    targetType: 'thread' | 'reply';
    reason: string;
    description?: string;
  }): Promise<IReport> {
    // Target existiert?
    const target = await this.getTarget(data.targetId, data.targetType);
    if (!target) {
      throw new AppError('TARGET_NOT_FOUND', 404);
    }
    
    // Bereits gemeldet?
    const existing = await Report.findOne({
      reporterId,
      targetId: data.targetId,
      status: 'pending'
    });
    
    if (existing) {
      throw new AppError('ALREADY_REPORTED', 400);
    }
    
    // Report erstellen
    const report = new Report({
      reporterId,
      targetId: data.targetId,
      targetType: data.targetType,
      targetOwnerId: target.userId,
      reason: data.reason as any,
      description: data.description
    });
    
    await report.save();
    
    logger.info(`[Mod] Report ${report._id} created by ${reporterId}`);
    
    return report;
  }
  
  /**
   * Reports abrufen (Mod-Only) — angereichert mit Content-Daten
   */
  async getReports(options: {
    status?: string;
    targetType?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ reports: any[]; total: number }> {
    const query: any = {};

    if (options.status) {
      query.status = options.status;
    }

    if (options.targetType) {
      query.targetType = options.targetType;
    }

    const limit = Math.min(options.limit || 50, 200);
    const skip = options.skip || 0;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query)
    ]);

    // Content anreichern
    const enriched = await Promise.all(reports.map(async (report) => {
      let content: any = null;
      let contentUrl: string | null = null;

      try {
        if (report.targetType === 'thread') {
          const thread = await Thread.findById(report.targetId)
            .select('title content userId')
            .lean() as any;
          if (thread) {
            content = { title: thread.title, content: thread.content, userId: thread.userId };
            contentUrl = `/community/thread/${report.targetId}`;
          }
        } else if (report.targetType === 'reply') {
          const reply = await Reply.findById(report.targetId)
            .select('content userId threadId')
            .lean() as any;
          if (reply) {
            content = { content: reply.content, userId: reply.userId };
            contentUrl = `/community/thread/${reply.threadId}`;
          }
        }
      } catch {
        // Inhalt nicht gefunden (bereits gelöscht)
      }

      return { ...report, content, contentUrl };
    }));

    return { reports: enriched, total };
  }
  
  /**
   * Report bearbeiten (Mod-Only)
   */
  async reviewReport(reportId: string, reviewerId: string, data: {
    action: 'none' | 'warning' | 'content_removed' | 'user_banned';
    note?: string;
  }): Promise<IReport | null> {
    const report = await Report.findById(reportId);
    
    if (!report) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    report.status = 'reviewed';
    report.reviewerId = reviewerId;
    report.reviewedAt = new Date();
    report.reviewNote = data.note;
    report.actionTaken = data.action;
    
    await report.save();
    
    // Actions durchführen
    switch (data.action) {
      case 'content_removed':
        await this.removeContent(report.targetId, report.targetType, reviewerId);
        break;
      
      case 'user_banned':
        await this.banUser(report.targetOwnerId, reviewerId, {
          reason: `Report: ${report.reason}`,
          type: 'temporary',
          days: 7,
          reportIds: [reportId]
        });
        break;
    }
    
    logger.info(`[Mod] Report ${reportId} reviewed by ${reviewerId}: ${data.action}`);
    
    return report;
  }
  
  /**
   * Content entfernen
   */
  async removeContent(targetId: string, targetType: 'thread' | 'reply', modId: string): Promise<void> {
    if (targetType === 'thread') {
      await threadService.delete(targetId, modId, true);
    } else {
      await replyService.delete(targetId, modId, true);
    }
    
    logger.info(`[Mod] ${targetType} ${targetId} removed by ${modId}`);
  }
  
  /**
   * User bannen
   */
  async banUser(userId: string, bannedBy: string, data: {
    reason: string;
    type: 'temporary' | 'permanent';
    days?: number;
    reportIds?: string[];
  }): Promise<IBan> {
    // Existing ban?
    let ban = await Ban.findOne({ userId });
    
    if (ban && ban.isActive) {
      throw new AppError('USER_ALREADY_BANNED', 400);
    }
    
    // Neuer Ban
    const expiresAt = data.type === 'temporary' && data.days
      ? new Date(Date.now() + data.days * 24 * 60 * 60 * 1000)
      : undefined;
    
    if (!ban) {
      ban = new Ban({
        userId,
        bannedBy,
        reason: data.reason,
        type: data.type,
        expiresAt,
        reportIds: data.reportIds || []
      });
    } else {
      ban.bannedBy = bannedBy;
      ban.reason = data.reason;
      ban.type = data.type;
      ban.expiresAt = expiresAt;
      ban.isActive = true;
      ban.reportIds = [...ban.reportIds, ...(data.reportIds || [])];
    }
    
    await ban.save();
    
    logger.warn(`[Mod] User ${userId} banned by ${bannedBy} (${data.type})`);
    
    return ban;
  }
  
  /**
   * Ban aufheben
   */
  async unbanUser(userId: string, unbanBy: string): Promise<void> {
    const ban = await Ban.findOne({ userId, isActive: true });
    
    if (!ban) {
      throw new AppError('USER_NOT_BANNED', 404);
    }
    
    ban.isActive = false;
    await ban.save();
    
    logger.info(`[Mod] User ${userId} unbanned by ${unbanBy}`);
  }
  
  /**
   * Thread pinnen/unpinnen (Mod-Only)
   */
  async togglePin(threadId: string, modId: string): Promise<boolean> {
    const thread = await Thread.findById(threadId);
    
    if (!thread) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    thread.isPinned = !thread.isPinned;
    await thread.save();
    
    logger.info(`[Mod] Thread ${threadId} ${thread.isPinned ? 'pinned' : 'unpinned'} by ${modId}`);
    
    return thread.isPinned;
  }
  
  /**
   * Thread locken/unlocken (Mod-Only)
   */
  async toggleLock(threadId: string, modId: string): Promise<boolean> {
    const thread = await Thread.findById(threadId);
    
    if (!thread) {
      throw new AppError('NOT_FOUND', 404);
    }
    
    thread.isLocked = !thread.isLocked;
    await thread.save();
    
    logger.info(`[Mod] Thread ${threadId} ${thread.isLocked ? 'locked' : 'unlocked'} by ${modId}`);
    
    return thread.isLocked;
  }
  
  /**
   * Target-Objekt abrufen
   */
  private async getTarget(targetId: string, targetType: 'thread' | 'reply'): Promise<any> {
    if (targetType === 'thread') {
      return Thread.findById(targetId).select('userId').lean();
    } else {
      return Reply.findById(targetId).select('userId').lean();
    }
  }
  
  /**
   * Moderation-Dashboard-Stats
   */
  async getStats(): Promise<any> {
    const [
      pendingReports,
      activeBans,
      reportsToday,
      bansToday
    ] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Ban.countDocuments({ isActive: true }),
      Report.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Ban.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);
    
    return {
      pendingReports,
      activeBans,
      reportsToday,
      bansToday
    };
  }
}

export const moderationService = new ModerationService();
