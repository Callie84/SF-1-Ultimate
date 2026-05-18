'use client';

import { useState } from 'react';
import { AdvisorForm } from '@/components/ai/advisor-form';
import { AdvisorResults } from '@/components/ai/advisor-results';
import { apiClient } from '@/lib/api-client';
import { Loader2, Lightbulb } from 'lucide-react';

interface AdvisorData {
  experience: 'beginner' | 'intermediate' | 'expert';
  goal: 'yield' | 'potency' | 'flavor' | 'speed';
  growType: 'indoor' | 'outdoor' | 'greenhouse';
  medium: 'soil' | 'coco' | 'hydro';
}

interface AdvisorResult {
  strainRecommendations: Array<{
    name: string;
    genetics: string;
    thc: string;
    flowering: string;
    difficulty: string;
    reason: string;
  }>;
  setupAdvice: string[];
  timeline: Array<{
    week: number;
    phase: string;
    tasks: string[];
  }>;
  tips: string[];
}

export default function AdvisorPage() {
  const [results, setResults] = useState<AdvisorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: AdvisorData) => {
    setIsLoading(true);
    setResults(null);

    try {
      const response = await apiClient.post('/api/ai/advice', data);
      setResults(response);
    } catch (error: any) {
      console.error('Advisor request failed:', error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setResults({
          strainRecommendations: [],
          setupAdvice: ['Du musst eingeloggt sein, um den Advisor zu nutzen. Bitte melde dich an unter /auth/login.'],
          timeline: [],
          tips: [],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Grow Advisor</h1>
        </div>
        <p className="text-muted-foreground">
          Personalisierte Empfehlungen für deinen perfekten Grow. Strain-Auswahl, Setup und Timeline.
        </p>
      </div>

      {!results ? (
        <AdvisorForm onSubmit={handleSubmit} isLoading={isLoading} />
      ) : (
        <AdvisorResults results={results} onReset={() => setResults(null)} />
      )}

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Erstelle deinen Plan...</h3>
          <p className="text-sm text-muted-foreground">
            Die AI analysiert deine Angaben und erstellt personalisierte Empfehlungen
          </p>
        </div>
      )}
    </div>
  );
}
