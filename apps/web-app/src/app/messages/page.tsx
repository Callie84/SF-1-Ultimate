// /apps/web-app/src/app/messages/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Loader2,
  Search,
  Trash2,
  MoreVertical,
  ArrowLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useDeleteConversation,
  Conversation,
} from '@/hooks/use-messages';
import { useAuth } from '@/components/providers/auth-provider';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversationsData, isLoading: conversationsLoading } = useConversations();
  const { data: messagesData, isLoading: messagesLoading } = useMessages(selectedConversation);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();
  const deleteConversation = useDeleteConversation();

  const conversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversation && user) {
      markAsRead.mutate(selectedConversation);
    }
  }, [selectedConversation, user]);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p !== user.id) || '';
  };

  const getUnreadCount = (conv: Conversation) => {
    return conv.unreadCounts[user.id] || 0;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const currentConv = conversations.find((c) => c._id === selectedConversation);
    if (!currentConv) return;

    const receiverId = getOtherParticipant(currentConv);

    sendMessage.mutate(
      { receiverId, content: messageInput.trim() },
      {
        onSuccess: () => {
          setMessageInput('');
        },
      }
    );
  };

  const handleDeleteConversation = (convId: string) => {
    deleteConversation.mutate(convId);
    if (selectedConversation === convId) {
      setSelectedConversation(null);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const otherUser = getOtherParticipant(conv);
    return otherUser.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedConv = conversations.find((c) => c._id === selectedConversation);

  return (
    <div className="flex h-[calc(100vh-10rem)] gap-4">
      {/* Conversations List */}
      <Card className={cn(
        'w-full md:w-96 flex-shrink-0 flex flex-col',
        selectedConversation && 'hidden md:flex'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Nachrichten
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Nachrichten</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                const unread = getUnreadCount(conv);
                const isSelected = selectedConversation === conv._id;

                return (
                  <div
                    key={conv._id}
                    className={cn(
                      'flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-muted'
                    )}
                    onClick={() => setSelectedConversation(conv._id)}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {otherUser.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{otherUser.substring(0, 8)}...</p>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), {
                              locale: de,
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>
                      {conv.lastMessagePreview && (
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessagePreview}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv._id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages View */}
      <Card className={cn(
        'flex-1 flex flex-col',
        !selectedConversation && 'hidden md:flex'
      )}>
        {selectedConversation && selectedConv ? (
          <>
            {/* Header */}
            <CardHeader className="flex-row items-center gap-4 pb-3 border-b">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarFallback>
                  {getOtherParticipant(selectedConv).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {getOtherParticipant(selectedConv).substring(0, 8)}...
                </p>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Keine Nachrichten</p>
                  <p className="text-sm text-muted-foreground">
                    Schreibe die erste Nachricht!
                  </p>
                </div>
              ) : (
                <>
                  {/* Reverse order for display (oldest first) */}
                  {[...messages].reverse().map((msg) => {
                    const isOwn = msg.senderId === user.id;
                    return (
                      <div
                        key={msg._id}
                        className={cn(
                          'flex',
                          isOwn ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg px-4 py-2',
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          <p
                            className={cn(
                              'text-xs mt-1',
                              isOwn
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {formatDistanceToNow(new Date(msg.createdAt), {
                              locale: de,
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Nachricht schreiben..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendMessage.isPending}
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Wähle eine Unterhaltung aus
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <MessagesContent />
      </Suspense>
    </DashboardLayout>
  );
}
