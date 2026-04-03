'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Check, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonsProps {
  url?: string;
  title: string;
  className?: string;
}

export function ShareButtons({ url, title, className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-muted-foreground mr-1">Teilen:</span>

      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 gap-1.5"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        <span className="text-xs">{copied ? 'Kopiert' : 'Link'}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 gap-1.5"
        asChild
      >
        <a
          href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="text-xs">WhatsApp</span>
        </a>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 gap-1.5"
        asChild
      >
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="text-xs">Telegram</span>
        </a>
      </Button>
    </div>
  );
}
