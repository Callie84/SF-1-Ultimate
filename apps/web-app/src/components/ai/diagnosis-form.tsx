'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Zap, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagnosisFormProps {
  onDiagnose: (data: { images?: File[]; description?: string }) => void;
  onQuickDiagnose: (description: string) => void;
  isLoading: boolean;
}

export function DiagnosisForm({ onDiagnose, onQuickDiagnose, isLoading }: DiagnosisFormProps) {
  const [images, setImages] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      setImages((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) =>
        file.type.startsWith('image/')
      );
      setImages((prev) => [...prev, ...files].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (images.length === 0 && !description.trim()) return;
    onDiagnose({
      images: images.length > 0 ? images : undefined,
      description: description.trim() || undefined,
    });
  };

  const handleQuickSubmit = () => {
    if (!description.trim()) return;
    onQuickDiagnose(description);
  };

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Bilder hochladen (Optional)
        </h3>

        {images.length === 0 ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="mb-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <ImagePlus className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h4 className="text-lg font-semibold mb-1">Fotos hochladen</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Klicken oder Drag & Drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG bis 10MB - Max. 5 Bilder
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative rounded-xl border bg-accent/50 p-1.5 group">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-36 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-3 right-3 bg-destructive hover:bg-destructive/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-3.5 h-3.5 text-destructive-foreground" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-1.5 h-[162px] flex flex-col items-center justify-center hover:border-primary/50 hover:bg-accent/50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Weitere hinzufugen</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="text-lg">📝</span>
          Beschreibung (Optional)
        </h3>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Beschreibe das Problem: z.B. 'gelbe Blatter an unteren Zweigen', 'braune Flecken auf Blattern'..."
          className="w-full rounded-lg border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={isLoading || (images.length === 0 && !description.trim())}
          className={cn(
            'flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
            (isLoading || (images.length === 0 && !description.trim())) &&
              'opacity-50 cursor-not-allowed'
          )}
        >
          Vollstandige Diagnose
        </button>

        {images.length === 0 && description.trim() && (
          <button
            onClick={handleQuickSubmit}
            disabled={isLoading}
            className="rounded-lg border bg-card px-6 py-3 text-sm font-medium hover:bg-accent transition-colors flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            Schnell-Diagnose
          </button>
        )}
      </div>
    </div>
  );
}
