// /apps/community-service/src/services/vote.service.ts
import { Vote, IVote } from '../models/Vote.model';
import { Thread } from '../models/Thread.model';
import { Reply } from '../models/Reply.model';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { gamificationHooks } from './gamification-hooks';
import { sendNotification } from './notification-client';

export class VoteService {
  /**
   * Vote erstellen/ändern
   */
  async vote(userId: string, data: {
    targetId: string;
    targetType: 'thread' | 'reply';
    type: 'upvote' | 'downvote';
  }): Promise<{ voted: boolean; removed: boolean }> {
    // Existierender Vote?
    const existing = await Vote.findOne({
      userId,
      targetId: data.targetId
    });
    
    // Gleicher Vote-Type → Remove
    if (existing && existing.type === data.type) {
      await Vote.deleteOne({ _id: existing._id });
      await this.updateVoteCount(data.targetId, data.targetType, data.type, -1);
      
      return { voted: false, removed: true };
    }
    
    // Anderer Vote-Type → Ändern
    if (existing && existing.type !== data.type) {
      const oldType = existing.type;
      existing.type = data.type;
      await existing.save();
      
      await this.updateVoteCount(data.targetId, data.targetType, oldType, -1);
      await this.updateVoteCount(data.targetId, data.targetType, data.type, 1);
      
      return { voted: true, removed: false };
    }
    
    // Neuer Vote
    const vote = new Vote({
      userId,
      targetId: data.targetId,
      targetType: data.targetType,
      type: data.type
    });
    
    await vote.save();
    await this.updateVoteCount(data.targetId, data.targetType, data.type, 1);
    
    // Gamification + Notification bei Upvote
    if (data.type === 'upvote') {
      const owner = await this.getTargetOwner(data.targetId, data.targetType);
      if (owner) {
        await gamificationHooks.onUpvoteReceived(owner, data.targetId, data.targetType);

        // Nur benachrichtigen wenn nicht sich selbst upgevoted
        if (owner !== userId) {
          const isThread = data.targetType === 'thread';
          const url = isThread
            ? `/community/thread/${data.targetId}`
            : undefined; // Reply: URL kann thread-ID nicht einfach ableiten
          sendNotification({
            userId: owner,
            type: 'reaction',
            title: isThread ? 'Dein Thread wurde geupvoted' : 'Deine Antwort wurde geupvoted',
            message: 'Dein Beitrag hat einen Upvote erhalten',
            relatedUrl: url,
            relatedId: data.targetId,
            relatedType: data.targetType,
          });
        }
      }
    }

    return { voted: true, removed: false };
  }
  
  /**
   * User's Votes abrufen
   */
  async getUserVotes(userId: string, targetIds: string[]): Promise<Map<string, 'upvote' | 'downvote'>> {
    const votes = await Vote.find({
      userId,
      targetId: { $in: targetIds }
    }).lean();
    
    const voteMap = new Map<string, 'upvote' | 'downvote'>();
    votes.forEach(v => voteMap.set(v.targetId, v.type));
    
    return voteMap;
  }
  
  /**
   * Vote-Counts aktualisieren
   */
  private async updateVoteCount(
    targetId: string,
    targetType: 'thread' | 'reply',
    voteType: 'upvote' | 'downvote',
    delta: number
  ): Promise<void> {
    const field = voteType === 'upvote' ? 'upvoteCount' : 'downvoteCount';
    
    const Model: any = targetType === 'thread' ? Thread : Reply;
    
    await Model.updateOne(
      { _id: targetId },
      { $inc: { [field]: delta } }
    );
  }
  
  /**
   * Target-Owner abrufen
   */
  private async getTargetOwner(targetId: string, targetType: 'thread' | 'reply'): Promise<string | null> {
    if (targetType === 'thread') {
      const thread = await Thread.findById(targetId).select('userId').lean();
      return thread?.userId || null;
    } else {
      const reply = await Reply.findById(targetId).select('userId').lean();
      return reply?.userId || null;
    }
  }
  
  /**
   * Top-Voted Content
   */
  async getTopVoted(options: {
    type: 'thread' | 'reply';
    period?: 'day' | 'week' | 'month' | 'alltime';
    limit?: number;
  }): Promise<any[]> {
    const query: any = { isDeleted: false };
    
    // Zeitraum
    if (options.period && options.period !== 'alltime') {
      const now = new Date();
      const daysAgo = {
        day: 1,
        week: 7,
        month: 30
      }[options.period];
      
      now.setDate(now.getDate() - daysAgo);
      query.createdAt = { $gte: now };
    }
    
    const Model: any = options.type === 'thread' ? Thread : Reply;
    const limit = Math.min(options.limit || 10, 50);
    
    const results = await Model.find(query)
      .sort({ upvoteCount: -1 })
      .limit(limit)
      .lean();
    
    return results;
  }
}

export const voteService = new VoteService();
