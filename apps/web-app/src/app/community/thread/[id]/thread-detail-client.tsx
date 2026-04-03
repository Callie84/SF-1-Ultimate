'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ShareButtons } from '@/components/share-buttons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ArrowUp, ArrowDown, MessageSquare, Check, Loader2,
  ArrowLeft, Pin, Lock, Pencil, Trash2, X,
} from 'lucide-react';
import { ReportButton } from '@/components/community/report-button';
import { ImageUploadWidget } from '@/components/community/image-upload-widget';
import Link from 'next/link';
import { formatRelativeTime, cn } from '@/lib/utils';
import {
  useThread,
  useReplies,
  useCreateReply,
  useVoteThread,
  useVoteReply,
  useUserVotesBatch,
  useUpdateThread,
  useDeleteThread,
  useUpdateReply,
  useDeleteReply,
} from '@/hooks/use-community';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';

function VoteButtons({
  score, targetId, userVote, onVote, size = 'md',
}: {
  score: number;
  targetId: string;
  userVote?: 'upvote' | 'downvote';
  onVote: (type: 'upvote' | 'downvote') => void;
  size?: 'sm' | 'md';
}) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  const btnSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => onVote('upvote')}
        className={cn(
          `flex items-center justify-center rounded ${btnSize} transition-colors`,
          userVote === 'upvote'
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
        )}
      >
        <ArrowUp className={iconSize} />
      </button>
      <span className={cn(
        'font-bold',
        size === 'sm' ? 'text-xs' : 'text-base',
        score > 0 ? 'text-primary' : score < 0 ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {score}
      </span>
      <button
        onClick={() => onVote('downvote')}
        className={cn(
          `flex items-center justify-center rounded ${btnSize} transition-colors`,
          userVote === 'downvote'
            ? 'text-destructive bg-destructive/10'
            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
        )}
      >
        <ArrowDown className={iconSize} />
      </button>
    </div>
  );
}

export function ThreadDetailClient() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.id as string;
  const { user } = useAuth();

  const { data: threadData, isLoading: threadLoading } = useThread(threadId);
  const { data: repliesData, isLoading: repliesLoading } = useReplies(threadId);
  const createReply = useCreateReply(threadId);
  const voteThread = useVoteThread(threadId);
  const updateThread = useUpdateThread(threadId);
  const deleteThread = useDeleteThread();

  const thread = threadData?.thread;
  const replies = repliesData?.replies || [];

  const allIds = [threadId, ...replies.map((r: any) => r.id || r._id)];
  const { data: userVotes } = useUserVotesBatch(user ? allIds : []);

  const [replyContent, setReplyContent] = useState('');
  const [replyImageUrls, setReplyImageUrls] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);

  // Thread edit state
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isThreadOwner = user && thread && (thread.userId === user.id || thread.user?.id === user.id);

  const handleSubmitReply = async (content: string, parentId?: string) => {
    if (!content.trim()) return;
    if (!user) { toast.error('Bitte einloggen'); return; }
    try {
      await createReply.mutateAsync({
        content,
        parentId,
        imageUrls: replyImageUrls.length > 0 ? replyImageUrls : undefined,
      } as any);
      toast.success('Antwort gesendet!');
      setReplyContent('');
      setReplyImageUrls([]);
      setReplyingTo(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Senden');
    }
  };

  const handleVoteThread = (type: 'upvote' | 'downvote') => {
    if (!user) { toast.error('Bitte einloggen'); return; }
    voteThread.mutate(type);
  };

  const handleStartEditThread = () => {
    setEditTitle(thread!.title);
    setEditContent(thread!.content);
    setIsEditingThread(true);
  };

  const handleSaveThread = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    try {
      await updateThread.mutateAsync({ title: editTitle, content: editContent } as any);
      toast.success('Thread aktualisiert!');
      setIsEditingThread(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  const handleDeleteThread = async () => {
    try {
      await deleteThread.mutateAsync(threadId);
      toast.success('Thread gelöscht');
      router.push('/community');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  if (threadLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <VoteButtons
                score={score}
                targetId={threadId}
                userVote={userVotes?.[threadId]}
                onVote={handleVoteThread}
              />

              <div className="flex-1">
                {/* Edit-Mode */}
                {isEditingThread ? (
                  <div className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xl font-bold"
                      placeholder="Titel..."
                    />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={8}
                      placeholder="Inhalt..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveThread}
                        disabled={updateThread.isPending || !editTitle.trim() || !editContent.trim()}
                      >
                        {updateThread.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Speichern'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingThread(false)}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold mb-3">
                      {thread.isPinned && <Pin className="inline h-5 w-5 mr-2 text-primary" />}
                      {thread.isLocked && <Lock className="inline h-5 w-5 mr-2 text-muted-foreground" />}
                      {thread.title}
                    </h1>

                    {thread.tags && thread.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {thread.tags.map((tag: string) => (
                          <span key={tag} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white font-medium">
                          {thread.user?.username?.charAt(0) || '?'}
                        </div>
                        <Link href={`/profile/${thread.user?.username}`} className="font-medium hover:underline">
                          {thread.user?.username || 'Unbekannt'}
                        </Link>
                      </div>
                      <span>•</span>
                      <span>{thread.createdAt ? formatRelativeTime(new Date(thread.createdAt)) : ''}</span>
                      <span>•</span>
                      <span>{thread.viewCount || 0} Aufrufe</span>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{thread.content}</p>
                    </div>

                    {thread.imageUrls && thread.imageUrls.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {thread.imageUrls.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={url}
                              alt={`Bild ${idx + 1}`}
                              className="h-32 w-32 rounded-lg object-cover border hover:opacity-90 transition-opacity"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex items-center gap-2 flex-wrap">
                      <ShareButtons title={thread.title} />

                      {user && !isThreadOwner && (
                        <ReportButton targetId={threadId} targetType="thread" />
                      )}

                      {isThreadOwner && !thread.isLocked && (
                        <>
                          <Button variant="ghost" size="sm" onClick={handleStartEditThread}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Bearbeiten
                          </Button>
                          {!showDeleteConfirm ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setShowDeleteConfirm(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Löschen
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-1.5">
                              <span className="text-sm text-destructive">Wirklich löschen?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-xs"
                                onClick={handleDeleteThread}
                                disabled={deleteThread.isPending}
                              >
                                {deleteThread.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ja'}
                              </Button>
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
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
            <div className="space-y-3">
              {replies.map((reply: any) => (
                <ReplyCard
                  key={reply.id || reply._id}
                  reply={reply}
                  threadId={threadId}
                  userVote={userVotes?.[reply.id || reply._id]}
                  currentUser={user}
                  onReplyClick={(id, username) => {
                    setReplyingTo({ id, username });
                    setTimeout(() => document.getElementById('reply-form')?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                />
              ))}
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
          <Card id="reply-form">
            <CardHeader>
              <h3 className="font-semibold">
                {replyingTo ? (
                  <span className="flex items-center gap-2">
                    Antwort an <span className="text-primary">@{replyingTo.username}</span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      (abbrechen)
                    </button>
                  </span>
                ) : 'Deine Antwort'}
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={replyingTo ? `@${replyingTo.username} ` : 'Schreibe deine Antwort...'}
                rows={5}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <ImageUploadWidget onChange={setReplyImageUrls} maxImages={5} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setReplyContent(''); setReplyImageUrls([]); setReplyingTo(null); }}>
                  Abbrechen
                </Button>
                <Button
                  onClick={() => handleSubmitReply(replyContent, replyingTo?.id)}
                  disabled={!replyContent.trim() || createReply.isPending}
                >
                  {createReply.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wird gesendet...</>
                  ) : 'Antworten'}
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

function ReplyCard({
  reply, threadId, userVote, currentUser, onReplyClick,
}: {
  reply: any;
  threadId: string;
  userVote?: 'upvote' | 'downvote';
  currentUser: any;
  onReplyClick: (id: string, username: string) => void;
}) {
  const replyId = reply.id || reply._id;
  const voteReply = useVoteReply(replyId, threadId);
  const updateReply = useUpdateReply(replyId, threadId);
  const deleteReply = useDeleteReply(threadId);
  const replyScore = (reply.upvoteCount || 0) - (reply.downvoteCount || 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = currentUser && (reply.userId === currentUser.id || reply.user?.id === currentUser.id);

  const handleVote = (type: 'upvote' | 'downvote') => {
    if (!currentUser) { toast.error('Bitte einloggen'); return; }
    voteReply.mutate(type);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await updateReply.mutateAsync({ content: editContent } as any);
      toast.success('Antwort aktualisiert!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReply.mutateAsync(replyId);
      toast.success('Antwort gelöscht');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  return (
    <Card className={reply.parentId ? 'ml-8 border-l-2 border-l-primary/20' : ''}>
      <CardHeader>
        <div className="flex gap-3">
          <VoteButtons
            score={replyScore}
            targetId={replyId}
            userVote={userVote}
            onVote={handleVote}
            size="sm"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-medium flex-shrink-0">
                {reply.user?.username?.charAt(0) || '?'}
              </div>
              <Link href={`/profile/${reply.user?.username}`} className="font-medium text-sm hover:underline">
                {reply.user?.username || 'Unbekannt'}
              </Link>
              {reply.isBestAnswer && (
                <span className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">
                  <Check className="h-3 w-3" />
                  Beste Antwort
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {reply.createdAt ? formatRelativeTime(new Date(reply.createdAt)) : ''}
              </span>
              {reply.isEdited && (
                <span className="text-xs text-muted-foreground italic">(bearbeitet)</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateReply.isPending || !editContent.trim()}>
                    {updateReply.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Speichern'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                {reply.imageUrls && reply.imageUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reply.imageUrls.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Bild ${idx + 1}`}
                          className="h-24 w-24 rounded-lg object-cover border hover:opacity-90 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}

            {!isEditing && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => onReplyClick(replyId, reply.user?.username || 'User')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  Antworten
                </button>

                {currentUser && !isOwner && (
                  <ReportButton targetId={replyId} targetType="reply" />
                )}

                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditContent(reply.content); setIsEditing(true); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      Bearbeiten
                    </button>

                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Löschen
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-destructive">Löschen?</span>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleteReply.isPending}
                          className="font-medium text-destructive hover:underline"
                        >
                          {deleteReply.isPending ? '...' : 'Ja'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Nein
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
