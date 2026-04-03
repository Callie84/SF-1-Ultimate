// /apps/web-app/src/app/api/admin/stats/route.ts
// Aggregiert Admin-Statistiken aus mehreren Services (server-side)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: authHeader,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  try {
    // Parallel alle Stats abrufen (fail-silent pro Service)
    const [usersRes, growsRes, growsActiveRes, threadsRes, moderationRes] = await Promise.allSettled([
      fetch('http://sf1-auth-service:3001/api/auth/admin/users?limit=1&page=1', { headers, signal: AbortSignal.timeout(3000) }),
      fetch('http://sf1-journal-service:3003/api/journal/feed?limit=1', { signal: AbortSignal.timeout(3000) }),
      fetch('http://sf1-journal-service:3003/api/journal/feed?limit=1&status=active', { signal: AbortSignal.timeout(3000) }),
      fetch('http://sf1-community-service:3005/api/community/threads?limit=1', { signal: AbortSignal.timeout(3000) }),
      fetch('http://sf1-community-service:3005/api/community/moderation/stats', { headers, signal: AbortSignal.timeout(3000) }),
    ]);

    // Users
    let users = { total: 0, newToday: 0 };
    if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
      const data = await usersRes.value.json().catch(() => ({}));
      users.total = data.total || 0;
    }

    // Grows (public feed — kein Auth nötig)
    let grows = { total: 0, active: 0 };
    if (growsRes.status === 'fulfilled' && growsRes.value.ok) {
      const data = await growsRes.value.json().catch(() => ({}));
      grows.total = data.total || 0;
    }
    if (growsActiveRes.status === 'fulfilled' && growsActiveRes.value.ok) {
      const data = await growsActiveRes.value.json().catch(() => ({}));
      grows.active = data.total || 0;
    }

    // Threads
    let threads = { total: 0, newToday: 0 };
    if (threadsRes.status === 'fulfilled' && threadsRes.value.ok) {
      const data = await threadsRes.value.json().catch(() => ({}));
      threads.total = data.pagination?.total || data.total || 0;
    }

    // Moderation
    let reports = { pending: 0 };
    if (moderationRes.status === 'fulfilled' && moderationRes.value.ok) {
      const data = await moderationRes.value.json().catch(() => ({}));
      reports.pending = data.stats?.pendingReports || 0;
    }

    return NextResponse.json(
      { users, grows, threads, reports },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    return NextResponse.json(
      { users: { total: 0, newToday: 0 }, grows: { total: 0, active: 0 }, threads: { total: 0, newToday: 0 }, reports: { pending: 0 } },
      { status: 200 }
    );
  }
}
