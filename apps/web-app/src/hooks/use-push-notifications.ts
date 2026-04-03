// apps/web-app/src/hooks/use-push-notifications.ts
// Web Push Notifications — VAPID basiert, kein Firebase
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api-client';
import { toast } from 'sonner';

type PushState = 'loading' | 'unsupported' | 'denied' | 'default' | 'subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [loading, setLoading] = useState(false);

  // Aktuellen Status ermitteln
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    // Prüfen ob bereits subscribed
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setState(sub ? 'subscribed' : 'default');
      });
    });
  }, []);

  // Push aktivieren
  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    setLoading(true);
    try {
      // VAPID Public Key vom Server holen
      const { vapidPublicKey } = await api.get<{ vapidPublicKey: string }>(
        '/api/notifications/push/vapid-key'
      );

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        toast.error('Push-Benachrichtigungen wurden abgelehnt.');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
      });

      await api.post('/api/notifications/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      setState('subscribed');
      toast.success('Push-Benachrichtigungen aktiviert!');
    } catch (err: any) {
      console.error('[Push] Subscribe error:', err);
      toast.error('Fehler beim Aktivieren der Push-Benachrichtigungen.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Push deaktivieren
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await api.delete('/api/notifications/push/subscribe', {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }

      setState('default');
      toast.success('Push-Benachrichtigungen deaktiviert.');
    } catch (err: any) {
      console.error('[Push] Unsubscribe error:', err);
      toast.error('Fehler beim Deaktivieren.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { state, loading, subscribe, unsubscribe };
}
