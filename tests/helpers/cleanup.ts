import { authClient } from './client.js';

interface CleanupTask {
  type: 'user' | 'thread' | 'grow' | 'notification';
  id: string;
  token?: string;
  email?: string;
  password?: string;
}

const tasks: CleanupTask[] = [];

export function registerCleanup(task: CleanupTask) {
  tasks.push(task);
}

export async function runCleanup() {
  for (const task of tasks.reverse()) {
    try {
      if (task.type === 'grow' && task.token) {
        const { journalClient, withAuth } = await import('./client.js');
        await journalClient.delete(`/api/journal/grows/${task.id}`, withAuth(task.token));
      } else if (task.type === 'thread' && task.token) {
        const { communityClient, withAuth } = await import('./client.js');
        await communityClient.delete(`/api/community/threads/${task.id}`, withAuth(task.token));
      } else if (task.type === 'notification') {
        // Notifications werden automatisch beim User-Delete entfernt
      } else if (task.type === 'user' && task.email && task.password) {
        // Frisch einloggen — der gespeicherte Token könnte durch Logout invalidiert sein
        let freshToken = task.token;
        try {
          const loginRes = await authClient.post('/api/auth/login', {
            email: task.email,
            password: task.password,
          });
          if (loginRes.status === 200 && loginRes.data?.accessToken) {
            freshToken = loginRes.data.accessToken;
          }
        } catch {
          // Re-Login fehlgeschlagen — versuche trotzdem mit gespeichertem Token
        }
        if (freshToken) {
          await authClient.delete('/api/auth/account', {
            headers: { Authorization: `Bearer ${freshToken}` },
            data: { password: task.password },
          });
        }
      }
    } catch {
      // Cleanup-Fehler ignorieren — besser dreckig als blockiert
    }
  }
  tasks.length = 0;
}
