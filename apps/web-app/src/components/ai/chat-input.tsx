'use client';

import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Stelle eine Frage an SF-1 AI..."
        disabled={disabled}
        className={cn(
          'flex-1 rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[44px] max-h-[160px]',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        rows={1}
        style={{
          height: 'auto',
          minHeight: '44px',
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          target.style.height = 'auto';
          target.style.height = Math.min(target.scrollHeight, 160) + 'px';
        }}
      />

      <button
        onClick={handleSubmit}
        disabled={!message.trim() || disabled}
        className={cn(
          'rounded-lg bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0',
          (!message.trim() || disabled) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
