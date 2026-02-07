'use client';

import { MessageSquare, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  title: string;
  lastMessage: Date;
}

interface ChatSessionsProps {
  sessions: Session[];
  currentSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
}

export function ChatSessions({
  sessions,
  currentSessionId,
  onNewSession,
  onSelectSession,
}: ChatSessionsProps) {
  return (
    <div className="rounded-xl border bg-card p-4 h-full flex flex-col">
      <div className="mb-4">
        <button
          onClick={onNewSession}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Neue Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        <h3 className="font-semibold text-sm mb-3">Sessions</h3>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Noch keine Sessions</p>
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                'w-full text-left rounded-lg p-3 transition-colors text-sm',
                currentSessionId === session.id
                  ? 'bg-primary/10 border border-primary/20 text-primary'
                  : 'hover:bg-accent'
              )}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2 mb-0.5">
                    {session.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.lastMessage).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
