'use client';

import { Calculator } from '@/components/tools/calculator';
import { Zap } from 'lucide-react';

export default function ECCalculatorPage() {
  return (
    <Calculator
      title="EC Calculator"
      description="Electrical Conductivity - Nährstoffkonzentration berechnen"
      icon={<Zap className="w-16 h-16 text-white" />}
      gradient="from-yellow-500 to-orange-500"
      fields={[
        {
          name: 'ppm',
          label: 'PPM-Wert',
          type: 'number',
          unit: 'ppm',
          defaultValue: 1000,
          step: 50,
          min: 0,
          help: 'Parts Per Million - Nährstoffkonzentration',
        },
        {
          name: 'scale',
          label: 'PPM-Scale',
          type: 'select',
          defaultValue: '500',
          options: [
            { value: '500', label: '0.5 Scale (EU Standard)' },
            { value: '700', label: '0.7 Scale (US/Truncheon)' },
          ],
          help: 'Standard in Europa: 0.5 Scale',
        },
      ]}
      calculate={(values) => {
        const ppm = values.ppm as number;
        const scale = Number(values.scale);
        return ppm / scale;
      }}
      resultUnit="mS/cm"
      resultLabel="EC-Wert"
      getStatus={(result) => {
        const ec = result as number;
        if (ec < 0.8) return { 
          text: 'Zu niedrig', 
          color: 'text-blue-400', 
          desc: 'Erhöhe die Nährstoffkonzentration' 
        };
        if (ec < 1.3) return { 
          text: 'Setzlinge', 
          color: 'text-green-400', 
          desc: 'Perfekt für junge Pflanzen' 
        };
        if (ec < 2.5) return { 
          text: 'Vegetativ optimal', 
          color: 'text-emerald-400', 
          desc: 'Gut für die Wachstumsphase' 
        };
        if (ec < 3.0) return { 
          text: 'Blüte optimal', 
          color: 'text-yellow-400', 
          desc: 'Perfekt für die Blütephase' 
        };
        return { 
          text: 'Zu hoch', 
          color: 'text-red-400', 
          desc: 'Risiko: Nährstoff-Burn! Verdünne die Lösung' 
        };
      }}
      info={{
        title: 'Was ist EC?',
        content: (
          <div className="space-y-4">
            <p>
              EC (Electrical Conductivity) misst die elektrische Leitfähigkeit deiner Nährlösung 
              und gibt an, wie viele gelöste Salze (Nährstoffe) in der Lösung sind.
            </p>
            <div className="rounded-lg border p-6">
              <h4 className="font-medium text-foreground mb-3">Optimale EC-Werte:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Setzlinge:</strong> 0.8 - 1.3 mS/cm</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Vegetativ:</strong> 1.5 - 2.5 mS/cm</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Blüte:</strong> 2.0 - 3.0 mS/cm</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Flush:</strong> 0.0 - 0.4 mS/cm</span>
                </li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Wichtig:</strong> Messe immer vor UND nach der Düngung.
              Der EC-Wert steigt nach der Nährstoffzugabe an.
            </p>
          </div>
        ),
      }}
    />
  );
}
