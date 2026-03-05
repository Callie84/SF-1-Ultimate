'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAds, Ad } from '@/hooks/use-ads';

interface AdCarouselProps {
  type: 'rectangle' | 'square';
  className?: string;
  autoPlayInterval?: number; // ms, default 5000
  showControls?: boolean;
  showDots?: boolean;
}

// Platzhalter-Ads (werden angezeigt wenn keine Ads im Backend vorhanden)
const PLACEHOLDER_ADS: Record<'rectangle' | 'square', Ad[]> = {
  rectangle: [
    {
      _id: 'placeholder-rect-1',
      type: 'rectangle',
      title: 'Werbefläche verfügbar',
      imageUrl: '',
      link: '#',
      linkTarget: '_blank',
      altText: 'Werbefläche',
      isActive: true,
      order: 0,
      createdAt: '',
    },
  ],
  square: [
    {
      _id: 'placeholder-sq-1',
      type: 'square',
      title: 'Werbefläche verfügbar',
      imageUrl: '',
      link: '#',
      linkTarget: '_blank',
      altText: 'Werbefläche',
      isActive: true,
      order: 0,
      createdAt: '',
    },
  ],
};

function PlaceholderAd({ type }: { type: 'rectangle' | 'square' }) {
  const isRect = type === 'rectangle';
  return (
    <div
      className={cn(
        'w-full flex items-center justify-center bg-muted/50 border-2 border-dashed border-muted-foreground/20 rounded-lg text-muted-foreground/50 select-none',
        isRect ? 'h-[90px]' : 'h-full aspect-square'
      )}
    >
      <div className="text-center px-4">
        <ExternalLink className="h-5 w-5 mx-auto mb-1 opacity-40" />
        <p className="text-xs font-medium">Werbefläche</p>
        <p className="text-[10px] mt-0.5 opacity-70">
          {isRect ? '728 × 90' : '300 × 300'}
        </p>
      </div>
    </div>
  );
}

export function AdCarousel({
  type,
  className,
  autoPlayInterval = 5000,
  showControls = true,
  showDots = true,
}: AdCarouselProps) {
  const { data } = useAds(type);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const ads = (data?.ads && data.ads.length > 0) ? data.ads : PLACEHOLDER_ADS[type];
  const isPlaceholder = !data?.ads || data.ads.length === 0;
  const total = ads.length;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-Play
  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const timer = setInterval(goNext, autoPlayInterval);
    return () => clearInterval(timer);
  }, [total, isHovered, goNext, autoPlayInterval]);

  // Reset index wenn sich die Ads ändern
  useEffect(() => {
    setCurrentIndex(0);
  }, [type, data]);

  if (total === 0) return null;

  const currentAd = ads[currentIndex];
  const isRect = type === 'rectangle';

  return (
    <div
      className={cn('relative group w-full', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ad Slot */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg',
          isRect ? 'h-[90px]' : 'aspect-square'
        )}
      >
        {/* Slides */}
        {ads.map((ad, index) => (
          <div
            key={ad._id}
            className={cn(
              'absolute inset-0 transition-all duration-500 ease-in-out',
              index === currentIndex
                ? 'opacity-100 translate-x-0'
                : index < currentIndex
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
            )}
          >
            {isPlaceholder || !ad.imageUrl ? (
              <PlaceholderAd type={type} />
            ) : (
              <a
                href={ad.link}
                target={ad.linkTarget}
                rel="noopener noreferrer"
                className="block w-full h-full"
                aria-label={ad.altText || ad.title}
                title={ad.title}
              >
                <img
                  src={ad.imageUrl}
                  alt={ad.altText || ad.title}
                  className="w-full h-full object-cover rounded-lg"
                  draggable={false}
                />
                {/* "Anzeige" Label */}
                <span className="absolute top-1 right-1 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                  Anzeige
                </span>
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Buttons (nur wenn mehrere Ads) */}
      {total > 1 && showControls && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label="Vorherige Anzeige"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            aria-label="Nächste Anzeige"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {/* Dots (nur wenn mehrere Ads) */}
      {total > 1 && showDots && (
        <div className="flex justify-center gap-1 mt-1.5">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'rounded-full transition-all duration-200',
                i === currentIndex
                  ? 'w-3 h-1.5 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
              )}
              aria-label={`Anzeige ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
