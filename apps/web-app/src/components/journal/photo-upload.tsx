'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, X, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadPhoto, useDeletePhoto } from '@/hooks/use-journal';
import { toast } from 'sonner';

interface ExistingPhoto {
  _id: string;
  thumbnailUrl: string;
  url: string;
  caption?: string;
}

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  error: boolean;
}

interface PhotoUploadProps {
  entryId: string;
  growId: string;
  existingPhotos?: ExistingPhoto[];
}

export function PhotoUpload({ entryId, growId, existingPhotos = [] }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadMutation = useUploadPhoto(entryId, growId);
  const deleteMutation = useDeletePhoto(growId);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newItems: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: Nur JPEG, PNG oder WebP erlaubt`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: Maximale Dateigröße ist 10 MB`);
        continue;
      }
      newItems.push({
        id: Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
        uploading: false,
        error: false,
      });
    }
    setPending(prev => [...prev, ...newItems]);
  }, []);

  const removePending = (id: string) => {
    setPending(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const uploadAll = async () => {
    const toUpload = pending.filter(p => !p.uploading && !p.error);
    if (toUpload.length === 0) return;

    for (const item of toUpload) {
      setPending(prev => prev.map(p => p.id === item.id ? { ...p, uploading: true } : p));
      try {
        await uploadMutation.mutateAsync({ file: item.file });
        setPending(prev => {
          const found = prev.find(p => p.id === item.id);
          if (found) URL.revokeObjectURL(found.preview);
          return prev.filter(p => p.id !== item.id);
        });
      } catch {
        setPending(prev => prev.map(p => p.id === item.id ? { ...p, uploading: false, error: true } : p));
        toast.error(`Fehler beim Hochladen von ${item.file.name}`);
      }
    }
  };

  const handleDeleteExisting = async (photoId: string) => {
    try {
      await deleteMutation.mutateAsync(photoId);
      toast.success('Foto gelöscht');
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const hasPendingReady = pending.some(p => !p.uploading && !p.error);

  return (
    <div className="space-y-4">
      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingPhotos.map(photo => (
            <div key={photo._id} className="relative group h-24 w-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted border">
              <img
                src={photo.thumbnailUrl || photo.url}
                alt="Foto"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDeleteExisting(photo._id)}
                disabled={deleteMutation.isPending}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Photos (not yet uploaded) */}
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pending.map(item => (
            <div
              key={item.id}
              className={`relative h-24 w-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted border ${item.error ? 'border-destructive' : ''}`}
            >
              <img src={item.preview} alt="Vorschau" className="h-full w-full object-cover" />
              {item.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
              {!item.uploading && (
                <button
                  type="button"
                  onClick={() => removePending(item.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 hover:bg-black/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              )}
              {item.error && (
                <div className="absolute bottom-0 left-0 right-0 bg-destructive/80 text-white text-[10px] text-center py-0.5">
                  Fehler
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Fotos hinzufügen</p>
        <p className="text-xs text-muted-foreground mt-1">
          Klicken oder Dateien hier ablegen · JPEG, PNG, WebP · max. 10 MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => addFiles(e.target.files)}
      />

      {/* Upload Button */}
      {hasPendingReady && (
        <Button
          type="button"
          onClick={uploadAll}
          disabled={uploadMutation.isPending}
          className="w-full gap-2"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {pending.filter(p => !p.uploading && !p.error).length} Foto(s) hochladen
        </Button>
      )}
    </div>
  );
}
