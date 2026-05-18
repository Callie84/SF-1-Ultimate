'use client';

import { useState } from 'react';
import { DiagnosisForm } from '@/components/ai/diagnosis-form';
import { DiagnosisResults } from '@/components/ai/diagnosis-results';
import { apiClient } from '@/lib/api-client';
import { Loader2, Stethoscope } from 'lucide-react';

interface DiagnosisResult {
  problem: string;
  confidence: number;
  description: string;
  causes: string[];
  solutions: string[];
  severity: 'low' | 'medium' | 'high';
}

export default function DiagnosePage() {
  const [results, setResults] = useState<DiagnosisResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDiagnose = async (data: { images?: File[]; description?: string }) => {
    setIsLoading(true);
    setResults(null);

    try {
      const formData = new FormData();

      if (data.images) {
        data.images.forEach((image) => {
          formData.append('images', image);
        });
      }

      if (data.description) {
        formData.append('description', data.description);
      }

      const response = await apiClient.post('/api/ai/diagnose', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(response.diagnoses || []);
    } catch (error: any) {
      console.error('Diagnosis failed:', error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setResults([{
          problem: 'Nicht eingeloggt',
          confidence: 0,
          description: 'Du musst eingeloggt sein, um die Diagnose zu nutzen. Bitte melde dich an.',
          causes: [],
          solutions: ['Melde dich an unter /auth/login'],
          severity: 'low',
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDiagnose = async (description: string) => {
    setIsLoading(true);
    setResults(null);

    try {
      const response = await apiClient.post('/api/ai/diagnose/quick', {
        description,
      });

      setResults(response.diagnoses || []);
    } catch (error) {
      console.error('Quick diagnosis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Stethoscope className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Pflanzen-Diagnose</h1>
        </div>
        <p className="text-muted-foreground">
          KI-gestützte Pflanzenanalyse mit GPT-4o Vision. Lade Bilder hoch oder beschreibe die Symptome.
        </p>
      </div>

      {!results ? (
        <DiagnosisForm
          onDiagnose={handleDiagnose}
          onQuickDiagnose={handleQuickDiagnose}
          isLoading={isLoading}
        />
      ) : (
        <DiagnosisResults results={results} onReset={() => setResults(null)} />
      )}

      {isLoading && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Analysiere deine Pflanze...</h3>
          <p className="text-sm text-muted-foreground">
            Die AI untersucht die Bilder und erstellt eine Diagnose
          </p>
        </div>
      )}
    </div>
  );
}
