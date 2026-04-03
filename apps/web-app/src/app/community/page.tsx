'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ZoneBanner } from '@/components/ads/zone-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, Users, TrendingUp, Pin, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { useCategories, useThreads, useSearchThreads } from '@/hooks/use-community';

const categoryColors: Record<string, string> = {
  beginners: 'bg-green-500',
  techniques: 'bg-blue-500',
  strains: 'bg-purple-500',
  problems: 'bg-red-500',
  equipment: 'bg-orange-500',
  harvest: 'bg-amber-500',
  general: 'bg-gray-500',
};

const categoryIcons: Record<string, string> = {
  beginners: '🌱',
  techniques: '🔧',
  strains: '🌿',
  problems: '🔬',
  equipment: '💡',
  harvest: '✂️',
  general: '💬',
};

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: threadsData, isLoading: threadsLoading } = useThreads(undefined, { isPinned: true, limit: 5 });
  const { data: searchResults, isLoading: searchLoading } = useSearchThreads(searchQuery);

  const categories = categoriesData?.categories || [];
  const pinnedThreads = threadsData?.threads?.filter((t: any) => t.isPinned) || [];
  const isSearching = searchQuery.length >= 2;

  const totalThreads = categories.reduce((acc: number, cat: any) => acc + (cat.threadCount || 0), 0);
  const totalPosts = categories.reduce((acc: number, cat: any) => acc + (cat.postCount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ZoneBanner zoneId="community-top" />
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Community Forum</h1>
            <p className="text-muted-foreground">
              Tausche dich mit anderen Growern aus und teile dein Wissen
            </p>
          </div>
          <Button size="sm" asChild className="flex-shrink-0">
            <Link href="/community/new">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Neuer Thread</span>
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Threads durchsuchen..."
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {isSearching && (
          <div>
            {searchLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (searchResults?.threads?.length ?? 0) === 0 ? (
              <p className="text-center text-muted-foreground py-6">Keine Threads gefunden für „{searchQuery}"</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{searchResults!.threads.length} Ergebnis(se)</p>
                {searchResults!.threads.map((thread: any) => (
                  <Link key={thread.id || thread._id} href={`/community/thread/${thread.id || thread._id}`}>
                    <Card className="hover:bg-accent transition-colors cursor-pointer">
                      <CardHeader className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{thread.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{thread.content}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {thread.replyCount || 0}
                            </span>
                            <span>{thread.createdAt ? formatRelativeTime(new Date(thread.createdAt)) : ''}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats + Categories + Pinned (hidden during search) */}
        {!isSearching && <>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kategorien</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categoriesLoading ? '...' : categories.length}
              </div>
              <p className="text-xs text-muted-foreground">Aktive Bereiche</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Threads</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categoriesLoading ? '...' : formatNumber(totalThreads)}
              </div>
              <p className="text-xs text-muted-foreground">Gesamt-Diskussionen</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beiträge</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categoriesLoading ? '...' : formatNumber(totalPosts)}
              </div>
              <p className="text-xs text-muted-foreground">Community Beiträge</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {categoriesLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Lade Kategorien...</span>
          </div>
        )}

        {/* Categories */}
        {!categoriesLoading && categories.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Kategorien</h2>
            <div className="space-y-4">
              {categories.map((category: any) => (
                <Link key={category.id || category._id} href={`/community/${category.slug}`}>
                  <Card className="transition-colors hover:bg-accent cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${categoryColors[category.slug] || 'bg-gray-500'} text-white text-2xl`}>
                          {category.icon || categoryIcons[category.slug] || '💬'}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{category.name}</CardTitle>
                          </div>
                          <CardDescription className="mt-1">
                            {category.description}
                          </CardDescription>

                          {/* Stats */}
                          <div className="mt-3 flex items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span>{formatNumber(category.threadCount || 0)} Threads</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{formatNumber(category.postCount || 0)} Beiträge</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty Categories */}
        {!categoriesLoading && categories.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Keine Kategorien vorhanden</h3>
            <p className="text-muted-foreground">Kategorien werden vom Admin erstellt.</p>
          </Card>
        )}

        {/* Pinned Threads */}
        {!threadsLoading && pinnedThreads.length > 0 && (
          <div>
            <h2 className="mb-4 text-xl font-semibold">Angepinnte Threads</h2>
            <div className="space-y-2">
              {pinnedThreads.map((thread: any) => (
                <Card key={thread.id || thread._id}>
                  <CardHeader className="py-3">
                    <div className="flex items-center gap-3">
                      <Pin className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <Link
                          href={`/community/thread/${thread.id || thread._id}`}
                          className="font-medium hover:underline"
                        >
                          📌 {thread.title}
                        </Link>
                        <div className="text-xs text-muted-foreground mt-1">
                          von {thread.user?.username || 'Unbekannt'} •{' '}
                          {thread.createdAt ? formatRelativeTime(new Date(thread.createdAt)) : ''}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          <span>{thread.viewCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{thread.replyCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
        </> /* end !isSearching */}
      </div>
    </DashboardLayout>
  );
}
