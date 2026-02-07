'use client';

import { Calculator } from '@/components/tools/calculator';
import { Wind } from 'lucide-react';

export default function CO2CalculatorPage() {
  return (
    <Calculator
      title="CO₂ Calculator"
      description="CO₂-Bedarf für optimales Wachstum berechnen"
      icon={<Wind className="w-16 h-16 text-white" />}
      gradient="from-teal-500 to-cyan-500"
      fields={[
        {
          name: 'length',
          label: 'Raum-Länge',
          type: 'number',
          unit: 'm',
          defaultValue: 2,
          step: 0.1,
          min: 0.1,
        },
        {
          name: 'width',
          label: 'Raum-Breite',
          type: 'number',
          unit: 'm',
          defaultValue: 2,
          step: 0.1,
          min: 0.1,
        },
        {
          name: 'height',
          label: 'Raum-Höhe',
          type: 'number',
          unit: 'm',
          defaultValue: 2,
          step: 0.1,
          min: 0.1,
        },
        {
          name: 'targetPPM',
          label: 'Ziel-PPM',
          type: 'number',
          unit: 'ppm',
          defaultValue: 1200,
          step: 100,
          min: 400,
          max: 1500,
          help: 'Ambient: 400ppm, Optimal: 1200-1500ppm',
        },
        {
          name: 'airChanges',
          label: 'Luftwechsel pro Stunde',
          type: 'number',
          unit: 'ACH',
          defaultValue: 1,
          step: 0.5,
          min: 0,
          max: 10,
          help: 'Wie oft wird die Luft pro Stunde ausgetauscht? (0 = geschlossen)',
        },
      ]}
      calculate={(values) => {
        const length = values.length as number;
        const width = values.width as number;
        const height = values.height as number;
        const targetPPM = values.targetPPM as number;
        const airChanges = values.airChanges as number;

        // Raumvolumen in m³
        const volume = length * width * height;

        // CO₂-Bedarf für einmalige Anreicherung (in Gramm)
        // 1 ppm = 1.8 mg/m³ bei 20°C
        const ambientPPM = 400;
        const ppmIncrease = targetPPM - ambientPPM;
        const co2Grams = (volume * ppmIncrease * 1.8) / 1000;

        // CO₂-Bedarf pro Stunde bei Luftwechsel (in Gramm/Stunde)
        const co2PerHour = co2Grams * airChanges;

        // CO₂-Bedarf pro Tag (12h Beleuchtung) in kg
        const co2PerDay = (co2PerHour * 12) / 1000;

        return co2PerDay;
      }}
      resultUnit="kg/Tag"
      resultLabel="CO₂-Bedarf (während Beleuchtung)"
      getStatus={(result) => {
        const kg = result as number;
        if (kg < 0.5) return { 
          text: 'Niedriger Bedarf', 
          color: 'text-green-400', 
          desc: 'Kleine Flasche reicht lange' 
        };
        if (kg < 1.5) return { 
          text: 'Mittlerer Bedarf', 
          color: 'text-yellow-400', 
          desc: 'Standard Setup' 
        };
        if (kg < 3) return { 
          text: 'Hoher Bedarf', 
          color: 'text-orange-400', 
          desc: 'Großer Raum oder viel Luftwechsel' 
        };
        return { 
          text: 'Sehr hoher Bedarf', 
          color: 'text-red-400', 
          desc: 'Prüfe Luftwechsel-Rate' 
        };
      }}
      info={{
        title: 'CO₂-Supplementierung verstehen',
        content: (
          <div className="space-y-4">
            <p>
              CO₂-Supplementierung kann deine Erträge um 20-30% steigern, wenn alle anderen Faktoren 
              (Licht, Nährstoffe, Temperatur) optimal sind.
            </p>
            <div className="rounded-lg border p-6">
              <h4 className="font-medium text-foreground mb-3">Optimale CO₂-Werte:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Ambient (Außenluft):</strong> 400 ppm</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Vegetativ:</strong> 800 - 1200 ppm</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Blüte (optimal):</strong> 1200 - 1500 ppm</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span><strong className="text-foreground">Maximum:</strong> 1500 ppm (mehr ist schädlich!)</span>
                </li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Wichtig:</strong> CO₂ nur während der Beleuchtungsphase
              einsetzen! Nachts wird kein CO₂ benötigt.
            </p>
            <p>
              <strong className="text-foreground">Tipp:</strong> Bei geschlossenem Raum (Luftwechsel = 0)
              brauchst du nur die initiale Füllung. Bei Luftwechsel musst du kontinuierlich nachfüllen.
            </p>
          </div>
        ),
      }}
    />
  );
}
