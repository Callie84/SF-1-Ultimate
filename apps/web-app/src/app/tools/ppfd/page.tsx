'use client';

import { Calculator } from '@/components/tools/calculator';
import { Sun } from 'lucide-react';

export default function PPFDCalculatorPage() {
  return (
    <Calculator
      title="PPFD Calculator"
      description="Photosynthetic Photon Flux Density - Lichtintensität berechnen"
      icon={<Sun className="w-16 h-16 text-white" />}
      gradient="from-purple-500 to-pink-500"
      fields={[
        {
          name: 'watts',
          label: 'Lampen-Watt',
          type: 'number',
          unit: 'W',
          defaultValue: 300,
          step: 10,
          min: 0,
          help: 'Tatsächliche Leistungsaufnahme der Lampe',
        },
        {
          name: 'type',
          label: 'Lampen-Typ',
          type: 'select',
          defaultValue: 'led',
          options: [
            { value: 'led', label: 'LED (Effizienz: 2.5 µmol/J)' },
            { value: 'hps', label: 'HPS (Effizienz: 1.7 µmol/J)' },
            { value: 'cmh', label: 'CMH/LEC (Effizienz: 1.9 µmol/J)' },
            { value: 'cfl', label: 'CFL (Effizienz: 1.0 µmol/J)' },
          ],
        },
        {
          name: 'area',
          label: 'Grow-Fläche',
          type: 'number',
          unit: 'm²',
          defaultValue: 1,
          step: 0.1,
          min: 0.1,
          help: 'Länge × Breite der beleuchteten Fläche',
        },
        {
          name: 'coverage',
          label: 'Abdeckung',
          type: 'number',
          unit: '%',
          defaultValue: 85,
          step: 5,
          min: 50,
          max: 100,
          help: 'Wie gut die Lampe die Fläche abdeckt (85% ist realistisch)',
        },
      ]}
      calculate={(values) => {
        const watts = values.watts as number;
        const type = values.type as string;
        const area = values.area as number;
        const coverage = (values.coverage as number) / 100;

        // Effizienz je nach Lampen-Typ
        const efficiency = {
          led: 2.5,
          hps: 1.7,
          cmh: 1.9,
          cfl: 1.0,
        }[type] || 2.5;

        // PPFD = (Watt × Effizienz × Coverage) / Fläche
        return (watts * efficiency * coverage) / area;
      }}
      resultUnit="µmol/m²/s"
      resultLabel="PPFD"
      getStatus={(result) => {
        const ppfd = result as number;
        if (ppfd < 200) return { 
          text: 'Zu niedrig', 
          color: 'text-blue-400', 
          desc: 'Erhöhe Watt oder verkleinere Fläche' 
        };
        if (ppfd < 400) return { 
          text: 'Setzlinge', 
          color: 'text-green-400', 
          desc: 'Gut für junge Pflanzen' 
        };
        if (ppfd < 600) return { 
          text: 'Vegetativ optimal', 
          color: 'text-emerald-400', 
          desc: 'Perfekt für die Wachstumsphase' 
        };
        if (ppfd < 1000) return { 
          text: 'Blüte optimal', 
          color: 'text-yellow-400', 
          desc: 'Optimal für maximale Erträge' 
        };
        if (ppfd < 1500) return { 
          text: 'Sehr hoch', 
          color: 'text-orange-400', 
          desc: 'Nur mit CO₂-Supplementierung empfohlen' 
        };
        return { 
          text: 'Extrem hoch', 
          color: 'text-red-400', 
          desc: 'Risiko: Licht-Stress! Erhöhe Abstand' 
        };
      }}
      info={{
        title: 'Was ist PPFD?',
        content: (
          <div className="space-y-4">
            <p>
              PPFD (Photosynthetic Photon Flux Density) misst die Anzahl der photosynthetisch aktiven 
              Photonen, die pro Sekunde auf einen Quadratmeter treffen.
            </p>
            <div className="rounded-lg border p-6">
              <h4 className="font-medium text-foreground mb-3">Optimale PPFD-Werte:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Setzlinge:</strong> 200 - 400 µmol/m²/s</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Vegetativ:</strong> 400 - 600 µmol/m²/s</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Blüte:</strong> 600 - 1000 µmol/m²/s</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Mit CO₂:</strong> 1000 - 1500 µmol/m²/s</span>
                </li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Wichtig:</strong> Dies ist eine Schätzung!
              Echte PPFD-Werte variieren je nach Reflektor, Abstand und Lampen-Qualität.
              Für präzise Messungen verwende ein PAR-Meter.
            </p>
          </div>
        ),
      }}
    />
  );
}
