'use client';

import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiagnosisResult {
  problem: string;
  confidence: number;
  description: string;
  causes: string[];
  solutions: string[];
  severity: 'low' | 'medium' | 'high';
}

interface DiagnosisResultsProps {
  results: DiagnosisResult[];
  onReset: () => void;
}

export function DiagnosisResults({ results, onReset }: DiagnosisResultsProps) {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'high':
        return { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      case 'medium':
        return { text: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
      case 'low':
        return { text: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      default:
        return { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border', badge: 'bg-muted text-muted-foreground' };
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5" />;
      case 'medium':
        return <Info className="h-5 w-5" />;
      case 'low':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return severity;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 text-center">
        <h2 className="text-xl font-bold mb-1">Diagnose-Ergebnis</h2>
        <p className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? 'Problem' : 'Probleme'} erkannt
        </p>
      </div>

      {/* Results */}
      {results.map((result, index) => {
        const style = getSeverityStyle(result.severity);
        return (
          <div key={index} className="rounded-xl border bg-card p-6 space-y-5">
            {/* Problem Header */}
            <div className="flex items-start gap-4">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0', style.bg, style.text)}>
                {getSeverityIcon(result.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h3 className="text-lg font-semibold">{result.problem}</h3>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', style.badge)}>
                    {getSeverityLabel(result.severity)}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {Math.round(result.confidence * 100)}% sicher
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.description}
                </p>
              </div>
            </div>

            {/* Causes */}
            {result.causes.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <span>🔍</span>
                  Mogliche Ursachen
                </h4>
                <ul className="space-y-2">
                  {result.causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-muted-foreground">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Solutions */}
            {result.solutions.length > 0 && (
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                  <span>💡</span>
                  Losungen
                </h4>
                <ol className="space-y-2">
                  {result.solutions.map((solution, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground pt-0.5">{solution}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        );
      })}

      {/* Actions */}
      <button
        onClick={onReset}
        className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Neue Diagnose
      </button>
    </div>
  );
}
