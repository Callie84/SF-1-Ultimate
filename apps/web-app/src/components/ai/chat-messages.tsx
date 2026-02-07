'use client';

import { Loader2, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {isLoading && <TypingIndicator />}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : '')}>
      {!isUser && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex justify-end')}>
        <div
          className={cn(
            'rounded-xl px-4 py-3',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-accent rounded-tl-sm'
          )}
        >
          <div className={cn(
            'text-sm prose max-w-none',
            isUser ? 'prose-invert' : 'prose-neutral dark:prose-invert'
          )}>
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-1" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-0.5" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-0.5" {...props} />,
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs" {...props} />
                  ) : (
                    <code className="block bg-background/50 p-3 rounded-lg text-xs overflow-x-auto" {...props} />
                  ),
                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                a: ({ node, ...props }) => (
                  <a className="text-primary underline hover:no-underline" {...props} />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <p className={cn(
          'text-[10px] text-muted-foreground mt-1',
          isUser ? 'text-right' : ''
        )}>
          {new Date(message.timestamp).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-accent rounded-xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}
