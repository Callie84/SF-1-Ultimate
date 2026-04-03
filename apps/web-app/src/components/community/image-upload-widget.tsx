'use client';

import { useRef, useState, useCallback } from 'react';
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api-client';

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
}

interface ImageUploadWidgetProps {
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function ImageUploadWidget({ onChange, maxImages = 5 }: ImageUploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximal ${maxImages} Bilder erlaubt`);
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining).filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(`${f.name}: Nur JPEG, PNG oder WebP erlaubt`);
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: Maximal 10 MB`);
        return false;
      }
      return true;
    });

    if (toUpload.length === 0) return;

    setUploading(true);
    try {
      const uploaded: UploadedImage[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'community');
        const res: any = await api.post('/api/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fileData = res.file || res;
        uploaded.push({
          id: fileData._id || fileData.id || Math.random().toString(36).slice(2),
          url: fileData.url,
          thumbnailUrl: fileData.thumbnailUrl || fileData.url,
        });
      }
      const next = [...images, ...uploaded];
      setImages(next);
      onChange(next.map(i => i.url));
    } catch {
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, onChange]);

  const removeImage = (id: string) => {
    const next = images.filter(i => i.id !== id);
    setImages(next);
    onChange(next.map(i => i.url));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  if (images.length === 0 && !uploading) {
    return (
      <div>
        <div
          className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <ImageIcon className="h-4 w-4 flex-shrink-0" />
          <span>Bilder hinzufügen (optional, max. {maxImages})</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Vorschau */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map(img => (
            <div key={img.id} className="relative group h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted border">
              <img src={img.thumbnailUrl} alt="Bild" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
          {uploading && (
            <div className="h-20 w-20 flex-shrink-0 rounded-lg border flex items-center justify-center bg-muted">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Mehr hinzufügen */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Weiteres Bild hinzufügen
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
}
