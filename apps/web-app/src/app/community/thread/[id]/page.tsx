'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, ArrowDown, MessageSquare, Share2, Flag, Award, Check, Loader2, ArrowLeft, Pin, Lock } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { useThread, useReplies, useCreateReply } from '@/hooks/use-community';
import { toast } from 'sonner';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params.id as string;

  const { data: threadData, isLoading: threadLoading } = useThread(threadId);
  const { data: repliesData, isLoading: repliesLoading } = useReplies(threadId);
  const createReply = useCreateReply(threadId);

  const [replyContent, setReplyContent] = useState('');

  const thread = threadData?.thread;
  const replies = repliesData?.replies || [];

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;

    try {
      await createReply.mutateAsync({ content: replyContent });
      toast.success('Antwort gesendet!');
      setReplyContent('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Senden');
    }
  };

  if (threadLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Lade Thread...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!thread) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">Thread nicht gefunden</h3>
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

  const score = (thread.upvoteCount || 0) - (thread.downvoteCount || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/community" className="hover:text-foreground">Community</Link>
          <span>/</span>
          {thread.category && (
            <>
              <Link href={`/community/${thread.category.slug}`} className="hover:text-foreground">
                {thread.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground truncate max-w-xs">{thread.title}</span>
        </div>

        {/* Thread */}
        <Card>
          <CardHeader>
            <div className="flex gap-4">
              {/* Voting */}
              <div className="flex flex-col items-center gap-1">
                <Button variant="ghost" size="icon">
                  <ArrowUp className="h-5 w-5" />
                </Button>
                <span className={`text-lg font-bold ${score > 0 ? 'text-primary' : score < 0 ? 'text-destructive' : ''}`}>
                  {score}
                </span>
                <Button variant="ghost" size="icon">
                  <ArrowDown className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-3">
                  {thread.isPinned && <Pin className="inline h-5 w-5 mr-2 text-primary" />}
                  {thread.isLocked && <Lock className="inline h-5 w-5 mr-2 text-muted-foreground" />}
                  {thread.title}
                </h1>

                {/* Tags */}
                {thread.tags && thread.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {thread.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Author & Meta */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white font-medium">
                      {thread.user?.username?.charAt(0) || '?'}
                    </div>
                    <span className="font-medium">{thread.user?.username || 'Unbekannt'}</span>
                  </div>
                  <span>•</span>
                  <span>{thread.createdAt ? formatRelativeTime(new Date(thread.createdAt)) : ''}</span>
                  <span>•</span>
                  <span>{thread.viewCount || 0} Aufrufe</span>
                </div>

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{thread.content}</p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                  <Button variant="ghost" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Teilen
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Flag className="mr-2 h-4 w-4" />
                    Melden
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Replies */}
        <div>
          <h2 className="mb-4 text-xl font-semibold">
            {thread.replyCount || replies.length} Antworten
          </h2>

          {repliesLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!repliesLoading && replies.length > 0 && (
            <div className="space-y-4">
              {replies.map((reply: any) => {
                const replyScore = (reply.upvoteCount || 0) - (reply.downvoteCount || 0);
                return (
                  <Card key={reply.id || reply._id} className={reply.parentId ? 'ml-12' : ''}>
                    <CardHeader>
                      <div className="flex gap-4">
                        {/* Voting */}
                        <div className="flex flex-col items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <span className={`text-sm font-semibold ${replyScore > 0 ? 'text-primary' : ''}`}>
                            {replyScore}
                          </span>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          {/* Author */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-white text-sm font-medium">
                              {reply.user?.username?.charAt(0) || '?'}
                            </div>
                            <span className="font-medium">{reply.user?.username || 'Unbekannt'}</span>
                            {reply.isBestAnswer && (
                              <div className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                                <Check className="h-3 w-3" />
                                Beste Antwort
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {reply.createdAt ? formatRelativeTime(new Date(reply.createdAt)) : ''}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
                          </div>

                          {/* Actions */}
                          <div className="mt-3 flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="mr-2 h-3 w-3" />
                              Antworten
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Flag className="mr-2 h-3 w-3" />
                              Melden
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}

          {!repliesLoading && replies.length === 0 && (
            <Card className="flex flex-col items-center justify-center py-8">
              <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Noch keine Antworten. Sei der Erste!</p>
            </Card>
          )}
        </div>

        {/* Reply Form */}
        {!thread.isLocked && (
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Deine Antwort</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Schreibe deine Antwort..."
                rows={6}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReplyContent('')}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || createReply.isPending}
                >
                  {createReply.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    'Antworten'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {thread.isLocked && (
          <Card className="bg-muted">
            <CardContent className="flex items-center justify-center py-6">
              <Lock className="mr-2 h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">Dieser Thread ist geschlossen.</span>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
