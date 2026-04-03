import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'sf1-super-secret-jwt-key-change-in-production';

export class WebSocketService {
  private io: SocketServer;
  
  constructor(httpServer: HttpServer) {
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'https://seedfinderpro.de',
        credentials: true
      },
      path: '/ws/notifications'
    });
    
    this.initialize();
  }
  
  /**
   * Initialize WebSocket server
   */
  private initialize(): void {
    this.io.on('connection', (socket) => {
      logger.debug(`[WS] Client connected: ${socket.id}`);
      
      // Auth
      socket.on('auth', (data: { userId: string; token: string }) => {
        const isValid = this.verifyToken(data.userId, data.token);

        if (isValid) {
          // Join user room
          socket.join(`user:${data.userId}`);
          socket.data.userId = data.userId;
          
          logger.info(`[WS] User ${data.userId} authenticated`);
          
          socket.emit('auth:success');
        } else {
          socket.emit('auth:failed');
          socket.disconnect();
        }
      });
      
      socket.on('disconnect', () => {
        logger.debug(`[WS] Client disconnected: ${socket.id}`);
      });
    });
    
    logger.info('[WS] WebSocket server initialized');
  }
  
  /**
   * Verify JWT token
   */
  private verifyToken(userId: string, token: string): boolean {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      return payload.userId === userId;
    } catch {
      return false;
    }
  }
  
  /**
   * Send to user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    this.io.to(`user:${userId}`).emit(event, data);
    logger.debug(`[WS] Sent ${event} to user ${userId}`);
  }
  
  /**
   * Send to multiple users
   */
  async sendToUsers(userIds: string[], event: string, data: any): Promise<void> {
    for (const userId of userIds) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
    logger.debug(`[WS] Sent ${event} to ${userIds.length} users`);
  }
  
  /**
   * Broadcast to all
   */
  async broadcast(event: string, data: any): Promise<void> {
    this.io.emit(event, data);
    logger.debug(`[WS] Broadcasted ${event}`);
  }
}

export let websocketService: WebSocketService;

export function initWebSocket(httpServer: HttpServer): void {
  websocketService = new WebSocketService(httpServer);
}