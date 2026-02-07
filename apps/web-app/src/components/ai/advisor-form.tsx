'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AdvisorFormProps {
  onSubmit: (data: AdvisorData) => void;
  isLoading: boolean;
}

interface AdvisorData {
  experience: 'beginner' | 'intermediate' | 'expert';
  goal: 'yield' | 'potency' | 'flavor' | 'speed';
  growType: 'indoor' | 'outdoor' | 'greenhouse';
  medium: 'soil' | 'coco' | 'hydro';
}

export function AdvisorForm({ onSubmit, isLoading }: AdvisorFormProps) {
  const [formData, setFormData] = useState<Partial<AdvisorData>>({});

  const handleSubmit = () => {
    if (!formData.experience || !formData.goal || !formData.growType || !formData.medium) {
      return;
    }
    onSubmit(formData as AdvisorData);
  };

  const isComplete =
    formData.experience && formData.goal && formData.growType && formData.medium;

  return (
    <div className="space-y-6">
      {/* Step 1: Experience */}
      <div className="rounded-xl border bg-card p-6">
        <label className="block font-semibold mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">1</span>
          Deine Erfahrung
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'beginner', label: 'Anfanger', desc: 'Erster Grow' },
            { value: 'intermediate', label: 'Fortgeschritten', desc: 'Einige Grows' },
            { value: 'expert', label: 'Profi', desc: 'Viel Erfahrung' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFormData({ ...formData, experience: option.value as any })}
              disabled={isLoading}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                formData.experience === option.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:bg-accent hover:border-accent-foreground/20'
              )}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Goal */}
      <div className="rounded-xl border bg-card p-6">
        <label className="block font-semibold mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">2</span>
          Dein Ziel
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'yield', label: 'Max. Ertrag', desc: 'Grosse Ernte erzielen' },
            { value: 'potency', label: 'Max. Potenz', desc: 'Hoher THC-Gehalt' },
            { value: 'flavor', label: 'Geschmack', desc: 'Terpen-reiche Buds' },
            { value: 'speed', label: 'Schnell', desc: 'Kurze Blutephase' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFormData({ ...formData, goal: option.value as any })}
              disabled={isLoading}
              className={cn(
                'rounded-lg border p-4 text-left transition-colors',
                formData.goal === option.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:bg-accent hover:border-accent-foreground/20'
              )}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: Setup */}
      <div className="rounded-xl border bg-card p-6">
        <label className="block font-semibold mb-4 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">3</span>
          Dein Setup
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block text-muted-foreground">Grow-Typ</label>
            <select
              value={formData.growType || ''}
              onChange={(e) =>
                setFormData({ ...formData, growType: e.target.value as any })
              }
              disabled={isLoading}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Wahle...</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="greenhouse">Greenhouse</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-muted-foreground">Medium</label>
            <select
              value={formData.medium || ''}
              onChange={(e) => setFormData({ ...formData, medium: e.target.value as any })}
              disabled={isLoading}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Wahle...</option>
              <option value="soil">Erde</option>
              <option value="coco">Coco</option>
              <option value="hydro">Hydro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isComplete || isLoading}
        className={cn(
          'w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
          (!isComplete || isLoading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        Empfehlungen erhalten
      </button>
    </div>
  );
}
