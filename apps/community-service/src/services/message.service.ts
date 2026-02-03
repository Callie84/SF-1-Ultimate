// /apps/community-service/src/services/message.service.ts
import { Conversation, IConversation } from '../models/Conversation.model';
import { Message, IMessage } from '../models/Message.model';
import { AppError } from '../utils/errors';

export class MessageService {
  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(userId1: string, userId2: string): Promise<IConversation> {
    const participants = [userId1, userId2].sort();

    let conversation = await Conversation.findOne({
      participants: { $all: participants, $size: 2 }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        unreadCounts: new Map([[userId1, 0], [userId2, 0]])
      });
    }

    // If user had deleted this conversation, restore it
    if (conversation.deletedBy.includes(userId1)) {
      conversation.deletedBy = conversation.deletedBy.filter(id => id !== userId1);
      await conversation.save();
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(
    userId: string,
    options: { skip?: number; limit?: number } = {}
  ): Promise<{ conversations: IConversation[]; total: number }> {
    const { skip = 0, limit = 20 } = options;

    const filter = {
      participants: userId,
      deletedBy: { $ne: userId }
    };

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter)
    ]);

    return { conversations: conversations as IConversation[], total };
  }

  /**
   * Get a specific conversation
   */
  async getConversation(conversationId: string, userId: string): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    if (!conversation.participants.includes(userId)) {
      throw new AppError('Access denied', 403);
    }

    return conversation;
  }

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<{ message: IMessage; conversation: IConversation }> {
    if (senderId === receiverId) {
      throw new AppError('Cannot send message to yourself', 400);
    }

    const conversation = await this.getOrCreateConversation(senderId, receiverId);

    // Create message
    const message = await Message.create({
      conversationId: conversation._id.toString(),
      senderId,
      receiverId,
      content
    });

    // Update conversation
    conversation.lastMessageId = message._id.toString();
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = content.substring(0, 100);

    // Increment unread count for receiver
    const currentUnread = conversation.unreadCounts.get(receiverId) || 0;
    conversation.unreadCounts.set(receiverId, currentUnread + 1);

    // If receiver had deleted this conversation, restore it
    if (conversation.deletedBy.includes(receiverId)) {
      conversation.deletedBy = conversation.deletedBy.filter(id => id !== receiverId);
    }

    await conversation.save();

    return { message, conversation };
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    options: { skip?: number; limit?: number } = {}
  ): Promise<{ messages: IMessage[]; total: number }> {
    const { skip = 0, limit = 50 } = options;

    // Verify access
    const conversation = await this.getConversation(conversationId, userId);

    const filter = {
      conversationId,
      isDeleted: false
    };

    const [messages, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter)
    ]);

    return { messages: messages as IMessage[], total };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);

    // Mark all unread messages from the other user as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    // Reset unread count
    conversation.unreadCounts.set(userId, 0);
    await conversation.save();
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await Conversation.find({
      participants: userId,
      deletedBy: { $ne: userId }
    });

    let total = 0;
    for (const conv of conversations) {
      total += conv.unreadCounts.get(userId) || 0;
    }

    return total;
  }

  /**
   * Delete a conversation (soft delete for user)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId);

    if (!conversation.deletedBy.includes(userId)) {
      conversation.deletedBy.push(userId);
      await conversation.save();
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.senderId !== userId) {
      throw new AppError('Can only delete your own messages', 403);
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
  }
}

export const messageService = new MessageService();
