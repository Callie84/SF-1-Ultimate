'use client';

import { RefreshCw, Calendar, Star, Settings, Lightbulb } from 'lucide-react';

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

interface AdvisorResultsProps {
  results: AdvisorResult;
  onReset: () => void;
}

export function AdvisorResults({ results, onReset }: AdvisorResultsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 text-center">
        <h2 className="text-xl font-bold mb-1">Dein Grow-Plan</h2>
        <p className="text-sm text-muted-foreground">
          Personalisierte Empfehlungen basierend auf deinen Angaben
        </p>
      </div>

      {/* Strain Recommendations */}
      {results.strainRecommendations.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Empfohlene Strains
          </h3>
          <div className="space-y-4">
            {results.strainRecommendations.map((strain, index) => (
              <div key={index} className="rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg flex-shrink-0">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{strain.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {strain.reason}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {strain.genetics}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        THC: {strain.thc}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {strain.flowering}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {strain.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Advice */}
      {results.setupAdvice.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Setup-Empfehlungen
          </h3>
          <div className="space-y-3">
            {results.setupAdvice.map((advice, index) => (
              <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <p className="text-sm text-muted-foreground pt-0.5">{advice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {results.timeline.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Grow-Timeline
          </h3>
          <div className="space-y-4">
            {results.timeline.map((week, index) => (
              <div key={index} className="rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                    W{week.week}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium mb-2">{week.phase}</h4>
                    <ul className="space-y-1.5">
                      {week.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">✓</span>
                          <span className="text-muted-foreground">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pro Tips */}
      {results.tips.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Pro-Tipps
          </h3>
          <div className="space-y-3">
            {results.tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="text-primary flex-shrink-0">💡</span>
                <p className="text-sm text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <button
        onClick={onReset}
        className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Neue Beratung
      </button>
    </div>
  );
}
