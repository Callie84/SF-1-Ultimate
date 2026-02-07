'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessages } from '@/components/ai/chat-messages';
import { ChatInput } from '@/components/ai/chat-input';
import { apiClient } from '@/lib/api-client';
import { Loader2, Plus, MessageSquare, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  title: string;
  lastMessage: Date;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hey! Ich bin dein SF-1 AI Assistant. Stell mir Fragen zu Cannabis-Anbau, Strains, Problemen oder was auch immer du wissen möchtest!',
      timestamp: new Date(),
    },
  ]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/ai/chat', {
        sessionId: currentSessionId,
        message: content,
      });

      const aiMessage: Message = {
        id: response.messageId || Date.now().toString(),
        role: 'assistant',
        content: response.content || response.response || '',
        timestamp: new Date(response.timestamp || Date.now()),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (!currentSessionId && response.sessionId) {
        setCurrentSessionId(response.sessionId);
        setSessions((prev) => [
          {
            id: response.sessionId,
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            lastMessage: new Date(),
          },
          ...prev,
        ]);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: isAuthError
            ? 'Du musst eingeloggt sein, um den AI-Chat zu nutzen. Bitte melde dich an unter [Login](/auth/login).'
            : 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Neue Session gestartet! Was möchtest du wissen?',
        timestamp: new Date(),
      },
    ]);
  };

  const handleLoadSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/ai/chat/sessions/${sessionId}`);
      setCurrentSessionId(sessionId);
      const msgs = (response.messages || []).map((msg: any) => ({
        ...msg,
        id: msg.id || Date.now().toString(),
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(msgs.length > 0 ? msgs : [{
        id: '1',
        role: 'assistant' as const,
        content: 'Session geladen. Wie kann ich dir weiterhelfen?',
        timestamp: new Date(),
      }]);
      setShowSessions(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Chat Header */}
      <div className="flex items-center justify-between pb-4 border-b mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
            AI
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Chat</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Online
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sessions Toggle */}
          <button
            onClick={() => setShowSessions(!showSessions)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              showSessions ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Sessions
            {showSessions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* New Session */}
          <button
            onClick={handleNewSession}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neu
          </button>
        </div>
      </div>

      {/* Sessions Dropdown */}
      {showSessions && (
        <div className="border rounded-lg bg-card p-4 mb-4 flex-shrink-0">
          <h3 className="text-sm font-semibold mb-3">Bisherige Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Noch keine Sessions vorhanden.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleLoadSession(session.id)}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors flex items-center justify-between',
                    currentSessionId === session.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {new Date(session.lastMessage).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-4 mb-4">
        <ChatMessages messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
