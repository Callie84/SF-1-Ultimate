'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTimelapse } from '@/hooks/use-journal';
import {
  Play, Pause, SkipBack, SkipForward, Download,
  Film, Loader2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SPEEDS = [0.5, 1, 2, 4] as const;
type Speed = typeof SPEEDS[number];

interface Props {
  growId: string;
  onClose?: () => void;
}

export function TimelapseViewer({ growId, onClose }: Props) {
  const { data, isLoading, isError } = useTimelapse(growId);

  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [exporting, setExporting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frames = data?.frames ?? [];
  const total = frames.length;
  const current = frames[frameIdx];

  // Preload images
  useEffect(() => {
    if (!frames.length) return;
    frames.forEach((f) => {
      const img = new Image();
      img.src = f.url;
    });
  }, [frames]);

  // Playback
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing || total === 0) return;

    const ms = Math.round(600 / speed);
    intervalRef.current = setInterval(() => {
      setFrameIdx((prev) => {
        if (prev >= total - 1) {
          setPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, total]);

  const prev = useCallback(() => {
    setPlaying(false);
    setFrameIdx((i) => Math.max(0, i - 1));
  }, []);

  const next = useCallback(() => {
    setPlaying(false);
    setFrameIdx((i) => Math.min(total - 1, i + 1));
  }, [total]);

  const togglePlay = useCallback(() => {
    if (frameIdx >= total - 1) setFrameIdx(0);
    setPlaying((p) => !p);
  }, [frameIdx, total]);

  // MP4-Export via canvas + MediaRecorder
  const exportVideo = useCallback(async () => {
    if (!frames.length) return;
    setExporting(true);
    setPlaying(false);

    try {
      const W = 800, H = 600;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(12);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
        videoBitsPerSecond: 1_500_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.start();

      const drawFrame = (src: string) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            // Letterbox
            const ratio = Math.min(W / img.naturalWidth, H / img.naturalHeight);
            const dw = img.naturalWidth * ratio;
            const dh = img.naturalHeight * ratio;
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        });

      const frameDelay = Math.round(600 / 2); // 2x speed für Export
      for (const frame of frames) {
        await drawFrame(frame.url);
        await new Promise((r) => setTimeout(r, frameDelay));
      }

      recorder.stop();
      await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timelapse-${growId}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Zeitraffer exportiert!');
    } catch (err) {
      console.error(err);
      toast.error('Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  }, [frames, growId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Lade Fotos...</span>
      </div>
    );
  }

  if (isError || total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground border rounded-lg border-dashed">
        <Film className="h-8 w-8 opacity-40" />
        <p className="text-sm">Noch keine Fotos für den Zeitraffer vorhanden.</p>
        <p className="text-xs opacity-60">Fotos zu Journal-Einträgen oder zur Galerie hinzufügen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Film className="h-4 w-4 text-primary" />
          Zeitraffer — {data?.strainName}
          <span className="text-xs font-normal text-muted-foreground">({total} Fotos)</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main frame */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
        {current && (
          <img
            key={frameIdx}
            src={current.url}
            alt={current.caption || `Frame ${frameIdx + 1}`}
            className="w-full h-full object-contain"
          />
        )}
        {/* Frame counter overlay */}
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {frameIdx + 1} / {total}
        </div>
        {/* Caption */}
        {current?.caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
            <p className="text-white text-xs">{current.caption}</p>
          </div>
        )}
        {/* Date */}
        {current?.date && (
          <div className="absolute bottom-0 right-2 pb-2 text-white/70 text-[10px]">
            {new Date(current.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Filmstrip */}
      <div className="flex gap-1 overflow-x-auto py-1">
        {frames.map((f, i) => (
          <button
            key={i}
            onClick={() => { setPlaying(false); setFrameIdx(i); }}
            className={`flex-shrink-0 h-12 w-12 rounded overflow-hidden border-2 transition-all ${
              i === frameIdx ? 'border-primary scale-105' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={f.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-muted cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          setFrameIdx(Math.round(ratio * (total - 1)));
          setPlaying(false);
        }}
      >
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
          style={{ width: `${total > 1 ? (frameIdx / (total - 1)) * 100 : 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={() => setFrameIdx(0)} className="text-muted-foreground hover:text-foreground" title="Anfang">
          <SkipBack className="h-4 w-4" />
        </button>
        <button onClick={prev} className="text-muted-foreground hover:text-foreground" title="Zurück">
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={togglePlay}
          className="rounded-full bg-primary text-primary-foreground h-9 w-9 flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        <button onClick={next} className="text-muted-foreground hover:text-foreground" title="Weiter">
          <ChevronRight className="h-5 w-5" />
        </button>
        <button onClick={() => setFrameIdx(total - 1)} className="text-muted-foreground hover:text-foreground" title="Ende">
          <SkipForward className="h-4 w-4" />
        </button>

        {/* Speed */}
        <div className="ml-auto flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                speed === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Export */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={exportVideo}
          disabled={exporting || total === 0}
          title="Als WebM-Video exportieren"
        >
          {exporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          {exporting ? 'Exportiere...' : 'Export'}
        </Button>
      </div>
    </div>
  );
}
