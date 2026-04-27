import { authClient, communityClient, journalClient, notifClient, withAuth } from './client.js';

interface CleanupTask {
  type: 'user' | 'thread' | 'grow' | 'notification';
  id: string;
  token?: string;
}

const tasks: CleanupTask[] = [];

export function registerCleanup(task: CleanupTask) {
  tasks.push(task);
}

export async function runCleanup() {
  // Rückwärts löschen (Abhängigkeiten zuerst)
  for (const task of tasks.reverse()) {
    try {
      if (task.type === 'grow' && task.token) {
        await journalClient.delete(`/api/journal/grows/${task.id}`, withAuth(task.token));
      } else if (task.type === 'thread' && task.token) {
        await communityClient.delete(`/api/community/threads/${task.id}`, withAuth(task.token));
      } else if (task.type === 'notification' && task.token) {
        // Notifications werden automatisch beim User-Delete entfernt
      } else if (task.type === 'user' && task.token) {
        await authClient.delete('/api/auth/account', withAuth(task.token));
      }
    } catch {
      // Cleanup-Fehler ignorieren — besser dreckig als blockiert
    }
  }
  tasks.length = 0;
}
