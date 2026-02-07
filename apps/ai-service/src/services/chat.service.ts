// /apps/ai-service/src/services/chat.service.ts
import { openai, MODELS, SYSTEM_PROMPTS } from '../config/openai';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export class ChatService {
  /**
   * Chat mit AI (mit Conversation History)
   * Returns format das das Frontend erwartet: { content, messageId, timestamp, sessionId }
   */
  async chat(userId: string, message: string, sessionId?: string): Promise<{
    content: string;
    messageId: string;
    timestamp: number;
    sessionId: string;
  }> {
    try {
      const session = await this.getOrCreateSession(userId, sessionId);

      const userMsgId = `msg_${Date.now()}_user`;
      session.messages.push({
        id: userMsgId,
        role: 'user',
        content: message,
        timestamp: Date.now()
      });

      // Nur letzte 10 Messages für Context (Token-Limit)
      const contextMessages = session.messages.slice(-10);

      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O_MINI,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.CHAT },
          ...contextMessages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
          }))
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const assistantResponse = response.choices[0].message.content || '';
      const assistantMsgId = `msg_${Date.now()}_ai`;
      const timestamp = Date.now();

      session.messages.push({
        id: assistantMsgId,
        role: 'assistant',
        content: assistantResponse,
        timestamp
      });

      await this.saveSession(session);

      logger.info(`[Chat] Session ${session.id}: ${message.substring(0, 50)}...`);

      return {
        content: assistantResponse,
        messageId: assistantMsgId,
        timestamp,
        sessionId: session.id
      };

    } catch (error) {
      logger.error('[Chat] Failed:', error);
      throw error;
    }
  }

  /**
   * Session abrufen oder erstellen
   */
  private async getOrCreateSession(userId: string, sessionId?: string): Promise<ChatSession> {
    if (sessionId) {
      try {
        const cached = await redis.get(`chat:session:${sessionId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        // Redis nicht verfügbar
      }
    }

    const newSessionId = `${userId}_${Date.now()}`;

    return {
      id: newSessionId,
      userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  /**
   * Session speichern (Redis mit längerem TTL)
   */
  private async saveSession(session: ChatSession): Promise<void> {
    session.updatedAt = Date.now();

    try {
      await redis.setex(
        `chat:session:${session.id}`,
        86400, // 24 Stunden TTL (statt 1 Stunde)
        JSON.stringify(session)
      );

      // Session-ID zum User-Index hinzufügen
      await redis.sadd(`chat:user:${session.userId}`, session.id);
      await redis.expire(`chat:user:${session.userId}`, 86400);
    } catch (e) {
      logger.error('[Chat] Failed to save session:', e);
    }
  }

  /**
   * Session-Historie abrufen
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const cached = await redis.get(`chat:session:${sessionId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Session löschen
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      await redis.del(`chat:session:${sessionId}`);
      if (session) {
        await redis.srem(`chat:user:${session.userId}`, sessionId);
      }
    } catch (e) {
      logger.error('[Chat] Failed to delete session:', e);
    }
  }

  /**
   * Alle Sessions eines Users
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      // Erst via User-Index versuchen
      const sessionIds = await redis.smembers(`chat:user:${userId}`);

      if (sessionIds.length > 0) {
        const sessions: ChatSession[] = [];
        for (const id of sessionIds) {
          const data = await redis.get(`chat:session:${id}`);
          if (data) {
            sessions.push(JSON.parse(data));
          } else {
            // Abgelaufene Session aus Index entfernen
            await redis.srem(`chat:user:${userId}`, id);
          }
        }
        return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      }

      // Fallback: Key-Scan (langsamer, aber findet auch alte Sessions)
      const keys = await redis.keys(`chat:session:${userId}_*`);
      const sessions: ChatSession[] = [];

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }

      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (e) {
      logger.error('[Chat] Failed to get user sessions:', e);
      return [];
    }
  }
}

export const chatService = new ChatService();
