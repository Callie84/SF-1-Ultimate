// /apps/web-app/src/components/analytics/top-content-table.tsx
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TopThread {
  _id: string;
  title: string;
  viewCount: number;
  replyCount: number;
  upvoteCount: number;
  engagementScore: number;
  categoryId?: string;
}

interface TopGrow {
  _id: string;
  strainName: string;
  environment: string;
  viewCount: number;
  likeCount: number;
  popularityScore: number;
  status: string;
}

interface TopContentTableProps {
  threads?: TopThread[];
  grows?: TopGrow[];
  title: string;
  type: 'threads' | 'grows';
  className?: string;
}

export function TopContentTable({ threads, grows, title, type, className }: TopContentTableProps) {
  const items = type === 'threads' ? threads : grows;

  if (!items || items.length === 0) {
    return (
      <div className={cn("bg-card rounded-lg border p-4 shadow-sm", className)}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-muted-foreground text-sm">Keine Daten verfügbar</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg border p-4 shadow-sm", className)}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium text-muted-foreground">#</th>
              <th className="text-left py-2 font-medium text-muted-foreground">Titel</th>
              <th className="text-right py-2 font-medium text-muted-foreground">Views</th>
              <th className="text-right py-2 font-medium text-muted-foreground">
                {type === 'threads' ? 'Replies' : 'Likes'}
              </th>
              <th className="text-right py-2 font-medium text-muted-foreground">Score</th>
            </tr>
          </thead>
          <tbody>
            {type === 'threads' && threads?.map((thread, index) => (
              <tr key={thread._id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="py-2 text-muted-foreground">{index + 1}</td>
                <td className="py-2">
                  <Link
                    href={`/community/thread/${thread._id}`}
                    className="hover:underline line-clamp-1"
                  >
                    {thread.title}
                  </Link>
                </td>
                <td className="py-2 text-right">{thread.viewCount.toLocaleString('de-DE')}</td>
                <td className="py-2 text-right">{thread.replyCount}</td>
                <td className="py-2 text-right font-medium">
                  {Math.round(thread.engagementScore)}
                </td>
              </tr>
            ))}
            {type === 'grows' && grows?.map((grow, index) => (
              <tr key={grow._id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="py-2 text-muted-foreground">{index + 1}</td>
                <td className="py-2">
                  <Link
                    href={`/journal/${grow._id}`}
                    className="hover:underline line-clamp-1"
                  >
                    {grow.strainName}
                  </Link>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({grow.environment})
                  </span>
                </td>
                <td className="py-2 text-right">{grow.viewCount.toLocaleString('de-DE')}</td>
                <td className="py-2 text-right">{grow.likeCount}</td>
                <td className="py-2 text-right font-medium">
                  {Math.round(grow.popularityScore)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
