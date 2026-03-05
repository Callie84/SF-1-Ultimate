'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Sprout,
  Loader2,
  Eye,
  Heart,
  MessageSquare,
  Calendar,
  Edit,
  Home,
  Sun,
  Leaf,
  CheckCircle2,
  Send,
  Trash2,
} from 'lucide-react';
import {
  useGrow,
  usePublicEntries,
  useGrowReactions,
  useLikeGrow,
  useGrowComments,
  useAddGrowComment,
  useDeleteGrowComment,
  useUserById,
} from '@/hooks/use-journal';
import { useAuth } from '@/components/providers/auth-provider';
import { formatDate, formatRelativeTime } from '@/lib/utils';

const STAGE_LABELS: Record<string, string> = {
  PLANNING: 'Planung', GERMINATION: 'Keimung', SEEDLING: 'Sämling',
  VEGETATIVE: 'Vegetation', FLOWERING: 'Blüte', DRYING: 'Trocknung',
  CURING: 'Curing', HARVESTED: 'Geerntet', ABANDONED: 'Abgebrochen',
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-500', germination: 'bg-yellow-500',
  vegetative: 'bg-green-500', flowering: 'bg-purple-500',
  drying: 'bg-orange-500', curing: 'bg-amber-700',
  harvested: 'bg-blue-500', archived: 'bg-gray-400',
};

function CommentItem({
  comment,
  currentUserId,
  growOwnerId,
  growId,
  onDelete,
  isReply = false,
}: {
  comment: any;
  currentUserId?: string;
  growOwnerId?: string;
  growId: string;
  onDelete: (id: string) => void;
  isReply?: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { data: author } = useUserById(comment.userId);
  const addComment = useAddGrowComment(growId);
  const displayName = author?.username || '…';
  const initial = displayName.charAt(0).toUpperCase();
  const isOwner = comment.userId === growOwnerId;
  const canDelete = currentUserId && comment.userId === currentUserId;

  const handleReply = async () => {
    const text = replyText.trim();
    if (!text) return;
    await addComment.mutateAsync({ content: text, parentId: comment._id });
    setReplyText('');
    setReplyOpen(false);
  };

  const inner = (
    <div className="flex gap-2.5 flex-1 min-w-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium">{displayName}</span>
          {isOwner && (
            <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 text-xs">
              Grower
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {comment.createdAt ? formatRelativeTime(new Date(comment.createdAt)) : ''}
          </span>
          {comment.isEdited && (
            <span className="text-xs text-muted-foreground">(bearbeitet)</span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{comment.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-2">
          {currentUserId && !isReply && (
            <button
              onClick={() => setReplyOpen(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {replyOpen ? 'Abbrechen' : 'Antworten'}
            </button>
          )}
        </div>

        {/* Reply form */}
        {replyOpen && (
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder="Antwort schreiben..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
            <Button
              size="sm"
              onClick={handleReply}
              disabled={!replyText.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Send className="mr-1 h-3 w-3" />
              )}
              Antworten
            </Button>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
            {comment.replies.map((reply: any) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                currentUserId={currentUserId}
                growOwnerId={growOwnerId}
                growId={growId}
                onDelete={onDelete}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isReply) {
    return (
      <div className="flex items-start justify-between gap-3">
        {inner}
        {canDelete && (
          <button
            onClick={() => onDelete(comment._id)}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            title="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {inner}
          {canDelete && (
            <button
              onClick={() => onDelete(comment._id)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
              title="Löschen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PublicGrowPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');

  const { data: growData, isLoading: growLoading, error } = useGrow(id);
  const { data: entriesData, isLoading: entriesLoading } = usePublicEntries(id);
  const { data: reactions } = useGrowReactions(id);
  const { data: commentsData } = useGrowComments(id);
  const likeMutation = useLikeGrow(id);
  const addCommentMutation = useAddGrowComment(id);
  const deleteCommentMutation = useDeleteGrowComment(id);

  const grow = growData?.grow;
  const entries = entriesData?.entries || [];
  const comments = commentsData?.comments || [];
  const isOwner = user && grow && grow.userId === user.id;
  const { data: growOwner } = useUserById(grow?.userId);
  const isLiked = reactions?.userReaction === 'fire';
  const likeCount = reactions ? (reactions.fire || 0) : (grow?.likeCount || 0);

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    await addCommentMutation.mutateAsync({ content: text });
    setCommentText('');
  };

  if (growLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !grow) {
    return (
      <DashboardLayout>
        <Card className="flex flex-col items-center justify-center py-16">
          <Sprout className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">Grow nicht gefunden</h3>
          <p className="mb-6 text-muted-foreground text-center">
            Dieser Grow existiert nicht oder ist nicht öffentlich.
          </p>
          <Button asChild>
            <Link href="/grows">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zu den Grows
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  const envLabel = grow.environment === 'indoor' ? 'Indoor' :
    grow.environment === 'outdoor' ? 'Outdoor' : 'Greenhouse';
  const nodeColor = STATUS_COLORS[grow.status] || 'bg-primary';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back */}
        <Link href="/grows" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Öffentliche Grows
        </Link>

        {/* Grow Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-2xl">
                    {grow.strainName}
                  </CardTitle>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium text-white ${nodeColor}`}>
                    {grow.status}
                  </span>
                </div>
                <CardDescription className="mt-2 space-y-1">
                  {growOwner && (
                    <div className="text-sm">
                      von{' '}
                      <Link href={`/profile/${growOwner.username}`} className="font-medium text-primary hover:underline">
                        @{growOwner.username}
                      </Link>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-sm">
                    {grow.breeder && (
                      <>
                        <span className="font-medium text-primary">{grow.breeder}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{envLabel}</span>
                    {grow.type && <><span>•</span><span className="capitalize">{grow.type}</span></>}
                    {grow.medium && <><span>•</span><span className="capitalize">{grow.medium}</span></>}
                  </div>
                </CardDescription>
              </div>
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/journal/${id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    Bearbeiten
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {grow.description && (
              <p className="text-muted-foreground mb-4">{grow.description}</p>
            )}

            {/* Harvest result */}
            {grow.status === 'harvested' && grow.yieldDry && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">{grow.yieldDry} g Trockengewicht</span>
                {grow.quality && (
                  <span className="text-sm text-muted-foreground ml-1">
                    · {'⭐'.repeat(grow.quality)} ({grow.quality}/5)
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Gestartet: {grow.startDate ? formatDate(new Date(grow.startDate)) : 'N/A'}</span>
              </div>
              {grow.harvestDate && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Geerntet: {formatDate(new Date(grow.harvestDate))}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>{grow.viewCount || 0} Aufrufe</span>
              </div>
            </div>

            {/* Like + Comment actions */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <button
                onClick={() => { if (user) likeMutation.mutate(); }}
                disabled={!user || likeMutation.isPending}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors border ${
                  isLiked
                    ? 'border-red-300 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
                    : 'border-border hover:border-red-300 hover:text-red-500'
                } ${!user ? 'cursor-default opacity-60' : ''}`}
                title={!user ? 'Einloggen um zu liken' : undefined}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likeCount}</span>
              </button>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>{comments.length || grow.commentCount || 0} Kommentare</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Journal ({entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'})
          </h2>
        </div>

        {entriesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!entriesLoading && entries.length > 0 && (
          <div>
            {entries.map((entry: any, idx: number) => {
              const isLast = idx === entries.length - 1;
              const stage = entry.stage || entry.growStage || '';
              const prevStage = idx > 0 ? (entries[idx - 1].stage || entries[idx - 1].growStage || '') : null;
              const isNewStage = stage && stage !== prevStage;
              const color = STATUS_COLORS[stage?.toLowerCase()] || 'bg-primary';

              const measurements = [
                { label: 'Höhe', value: entry.measurements?.height ?? entry.height, unit: 'cm' },
                { label: 'pH', value: entry.measurements?.ph ?? entry.ph, unit: '' },
                { label: 'EC', value: entry.measurements?.ec ?? entry.ec, unit: '' },
                { label: 'Temp', value: entry.measurements?.temperature ?? entry.temperature, unit: '°C' },
                { label: 'Feuchte', value: entry.measurements?.humidity ?? entry.humidity, unit: '%' },
              ].filter(m => m.value !== undefined && m.value !== null && m.value !== '');

              return (
                <div key={entry.id || entry._id}>
                  {isNewStage && (
                    <div className="flex items-center gap-3 py-3">
                      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`} />
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {STAGE_LABELS[stage] || stage}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm ${color}`}>
                        D{entry.day ?? '?'}
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-border min-h-[28px] my-2" />}
                    </div>

                    <div className={`flex-1 min-w-0 ${!isLast ? 'pb-6' : 'pb-2'}`}>
                      <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
                        <div>
                          <h3 className="font-semibold">
                            {entry.title || `Tag ${entry.day ?? '?'}`}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.week && `Woche ${entry.week} · `}
                            {entry.createdAt ? formatRelativeTime(new Date(entry.createdAt)) : ''}
                          </p>
                        </div>

                        {(entry.content || entry.notes) && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {entry.content || entry.notes}
                          </p>
                        )}

                        {entry.photos && entry.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {entry.photos.map((photo: any, pidx: number) => {
                              const url = typeof photo === 'string' ? photo : (photo.thumbnailUrl || photo.url);
                              return (
                                <div key={photo._id || pidx} className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                                  {url ? (
                                    <img src={url} alt={`Foto ${pidx + 1}`} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <Sprout className="h-6 w-6 text-muted-foreground/40" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {measurements.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 rounded-md bg-muted/50 p-2.5">
                            {measurements.map(m => (
                              <div key={m.label} className="text-center">
                                <div className="text-xs text-muted-foreground">{m.label}</div>
                                <div className="font-semibold text-sm">{m.value}{m.unit}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 border-t pt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5" />
                            {entry.stats?.reactions || entry.reactionCount || 0}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {entry.stats?.comments || entry.commentCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!entriesLoading && entries.length === 0 && (
          <Card className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Noch keine Einträge in diesem Grow.</p>
          </Card>
        )}

        {/* Comments Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Kommentare ({comments.length})
          </h2>

          {/* Add comment form */}
          {user ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Textarea
                  placeholder="Schreibe einen Kommentar..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    size="sm"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Kommentieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-primary hover:underline">Einloggen</Link> um zu kommentieren.
              </CardContent>
            </Card>
          )}

          {/* Comment list */}
          {comments.length > 0 && (
            <div className="space-y-3">
              {comments.map((comment: any) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  currentUserId={user?.id}
                  growOwnerId={grow.userId}
                  growId={id}
                  onDelete={(cid) => deleteCommentMutation.mutate(cid)}
                />
              ))}
            </div>
          )}

          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Kommentare. Sei der Erste!
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
