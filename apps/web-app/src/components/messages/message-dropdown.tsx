// /apps/web-app/src/components/messages/message-dropdown.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  useConversations,
  useUnreadMessageCount,
  useMarkMessagesAsRead,
  Conversation,
} from '@/hooks/use-messages';
import { useAuth } from '@/components/providers/auth-provider';

export function MessageDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadData } = useUnreadMessageCount();
  const { data: conversationsData, isLoading } = useConversations({ limit: 5 });
  const markAsRead = useMarkMessagesAsRead();

  const unreadCount = unreadData?.count || 0;
  const conversations = conversationsData?.conversations || [];

  if (!user) return null;

  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find((p) => p !== user.id) || '';
  };

  const getUnreadCount = (conv: Conversation) => {
    return conv.unreadCounts[user.id] || 0;
  };

  const handleConversationClick = (conv: Conversation) => {
    const unread = getUnreadCount(conv);
    if (unread > 0) {
      markAsRead.mutate(conv._id);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Nachrichten</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} ungelesen
            </span>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Keine Nachrichten
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {conversations.map((conv) => {
              const otherUser = getOtherParticipant(conv);
              const unread = getUnreadCount(conv);

              return (
                <DropdownMenuItem
                  key={conv._id}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer',
                    unread > 0 && 'bg-muted/50'
                  )}
                  asChild
                >
                  <Link
                    href={`/messages?conversation=${conv._id}`}
                    onClick={() => handleConversationClick(conv)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {otherUser.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {otherUser.substring(0, 8)}...
                      </p>
                      {conv.lastMessagePreview && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {conv.lastMessagePreview}
                        </p>
                      )}
                      {conv.lastMessageAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), {
                            addSuffix: true,
                            locale: de,
                          })}
                        </p>
                      )}
                    </div>
                    {unread > 0 && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/messages"
            className="w-full text-center text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            Alle Nachrichten anzeigen
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
