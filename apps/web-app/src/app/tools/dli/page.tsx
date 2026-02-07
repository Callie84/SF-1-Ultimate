'use client';

import { Calculator } from '@/components/tools/calculator';
import { Sun } from 'lucide-react';

export default function DLICalculatorPage() {
  return (
    <Calculator
      title="DLI Calculator"
      description="Daily Light Integral - Tägliche Lichtmenge berechnen"
      icon={<Sun className="w-16 h-16 text-white" />}
      gradient="from-orange-500 to-red-500"
      fields={[
        {
          name: 'ppfd',
          label: 'PPFD',
          type: 'number',
          unit: 'µmol/m²/s',
          defaultValue: 600,
          step: 50,
          min: 0,
          help: 'Photosynthetic Photon Flux Density - Lichtintensität',
        },
        {
          name: 'hours',
          label: 'Photoperiode',
          type: 'number',
          unit: 'Stunden',
          defaultValue: 18,
          step: 0.5,
          min: 0,
          max: 24,
          help: 'Beleuchtungszeit pro Tag (Veg: 18h, Blüte: 12h)',
        },
      ]}
      calculate={(values) => {
        const ppfd = values.ppfd as number;
        const hours = values.hours as number;
        // DLI = PPFD × Photoperiode × 0.0036
        return ppfd * hours * 0.0036;
      }}
      resultUnit="mol/m²/day"
      resultLabel="DLI (Daily Light Integral)"
      getStatus={(result) => {
        const dli = result as number;
        if (dli < 15) return { 
          text: 'Zu niedrig', 
          color: 'text-blue-400', 
          desc: 'Erhöhe PPFD oder Beleuchtungszeit' 
        };
        if (dli < 25) return { 
          text: 'Setzlinge', 
          color: 'text-green-400', 
          desc: 'Perfekt für junge Pflanzen' 
        };
        if (dli < 40) return { 
          text: 'Vegetativ optimal', 
          color: 'text-emerald-400', 
          desc: 'Optimal für die Wachstumsphase' 
        };
        if (dli < 50) return { 
          text: 'Blüte optimal', 
          color: 'text-yellow-400', 
          desc: 'Perfekt für maximale Erträge' 
        };
        if (dli < 65) return { 
          text: 'Sehr hoch', 
          color: 'text-orange-400', 
          desc: 'An der Obergrenze - beobachte auf Stress' 
        };
        return { 
          text: 'Zu hoch', 
          color: 'text-red-400', 
          desc: 'Risiko: Licht-Stress! Reduziere Intensität' 
        };
      }}
      info={{
        title: 'Was ist DLI?',
        content: (
          <div className="space-y-4">
            <p>
              DLI (Daily Light Integral) misst die gesamte Menge an photosynthetisch aktivem Licht, 
              die eine Pflanze pro Tag erhält. Es ist die Summe aus PPFD × Zeit.
            </p>
            <div className="rounded-lg border p-6">
              <h4 className="font-medium text-foreground mb-3">Optimale DLI-Werte:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Setzlinge:</strong> 15 - 25 mol/m²/day</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Vegetativ:</strong> 25 - 40 mol/m²/day</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Blüte:</strong> 35 - 50 mol/m²/day</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Maximum:</strong> 65 mol/m²/day</span>
                </li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Formel:</strong> DLI = PPFD × Photoperiode × 0.0036
            </p>
            <p>
              <strong className="text-foreground">Tipp:</strong> Du kannst die gleiche DLI mit verschiedenen
              Kombinationen aus PPFD und Beleuchtungszeit erreichen!
            </p>
          </div>
        ),
      }}
    />
  );
}
