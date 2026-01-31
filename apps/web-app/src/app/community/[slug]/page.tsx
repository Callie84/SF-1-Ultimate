'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Plus, ArrowUp, ArrowDown, MessageSquare, Eye, Award, Loader2, ArrowLeft, Pin, Lock } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import { useThreads } from '@/hooks/use-community';
import api from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

export default function CategoryThreadsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('hot');

  // Fetch category details
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/community/categories/${slug}`);
      return data;
    },
  });

  // Fetch threads for this category
  const { data: threadsData, isLoading: threadsLoading } = useThreads(
    categoryData?.category?.id || categoryData?.category?._id,
    { sort, limit: 20 }
  );

  const category = categoryData?.category;
  const threads = threadsData?.threads || [];
  const isLoading = categoryLoading || threadsLoading;

  if (categoryLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Kategorie...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!category) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">Kategorie nicht gefunden</h3>
          <Button asChild>
            <Link href="/community">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück zur Community
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Link */}
        <Link href="/community" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Community
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-4xl">{category.icon || '💬'}</div>
              <div>
                <h1 className="text-3xl font-bold">{category.name}</h1>
                <p className="text-muted-foreground">{category.description}</p>
              </div>
            </div>
          </div>
          <Button asChild>
            <Link href={`/community/new?category=${slug}`}>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Thread
            </Link>
          </Button>
        </div>

        {/* Sorting */}
        <div className="flex items-center gap-2">
          <Button
            variant={sort === 'hot' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setSort('hot')}
          >
            Hot
          </Button>
          <Button
            variant={sort === 'new' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setSort('new')}
          >
            Neu
          </Button>
          <Button
            variant={sort === 'top' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setSort('top')}
          >
            Top
          </Button>
        </div>

        {/* Loading */}
        {threadsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Threads List */}
        {!threadsLoading && threads.length > 0 && (
          <div className="space-y-3">
            {threads.map((thread: any) => (
              <Card key={thread.id || thread._id} className="hover:bg-accent transition-colors">
                <CardHeader className="p-4">
                  <div className="flex gap-4">
                    {/* Voting */}
                    <div className="flex flex-col items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <span className={`text-sm font-semibold ${(thread.upvoteCount - thread.downvoteCount) > 0 ? 'text-primary' : ''}`}>
                        {thread.upvoteCount - thread.downvoteCount || 0}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/community/thread/${thread.id || thread._id}`} className="group">
                        <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                          {thread.isPinned && <Pin className="inline h-4 w-4 mr-1 text-primary" />}
                          {thread.isLocked && <Lock className="inline h-4 w-4 mr-1 text-muted-foreground" />}
                          {thread.title}
                        </h3>
                      </Link>

                      {/* Tags */}
                      {thread.tags && thread.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {thread.tags.slice(0, 4).map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Meta */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium">
                            {thread.user?.username?.charAt(0) || '?'}
                          </div>
                          <span>{thread.user?.username || 'Unbekannt'}</span>
                        </div>
                        <span>•</span>
                        <span>{thread.createdAt ? formatRelativeTime(new Date(thread.createdAt)) : ''}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{formatNumber(thread.viewCount || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{thread.replyCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!threadsLoading && threads.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Keine Threads in dieser Kategorie</h3>
            <p className="text-muted-foreground mb-4">Sei der Erste, der einen Thread startet!</p>
            <Button asChild>
              <Link href={`/community/new?category=${slug}`}>
                <Plus className="mr-2 h-4 w-4" />
                Neuer Thread
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
