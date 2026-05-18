'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedUrl?: string;
  createdAt: string;
}

const typeEmoji: Record<string, string> = {
  comment: '💬',
  reply: '↩️',
  reaction: '❤️',
  follow: '👤',
  mention: '@',
  price_alert: '🏷️',
  milestone: '🏆',
  badge: '🎖️',
  system: 'ℹ️',
};

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const token = Cookies.get('sf1_access_token');
    if (!token) return;

    // Verbindung aufbauen
    const socket = io(window.location.origin, {
      path: '/ws/notifications',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Auth nach Connect
      socket.emit('auth', { userId, token });
    });

    socket.on('auth:success', () => {
      // Authentifiziert — warte auf Events
    });

    socket.on('auth:failed', () => {
      socket.disconnect();
    });

    socket.on('notification:new', (notification: RealtimeNotification) => {
      // Query-Cache invalidieren → Dropdown + Seite aktualisieren
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Toast anzeigen
      const emoji = typeEmoji[notification.type] || '🔔';
      toast(notification.title, {
        description: notification.message,
        action: notification.relatedUrl
          ? {
              label: 'Ansehen',
              onClick: () => { window.location.href = notification.relatedUrl!; },
            }
          : undefined,
        duration: 5000,
      });
    });

    socket.on('disconnect', () => {
      // Stille Wiederverbindung
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, queryClient]);
}
