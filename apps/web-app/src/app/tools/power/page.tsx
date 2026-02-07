'use client';

import { Calculator } from '@/components/tools/calculator';
import { Plug } from 'lucide-react';

export default function PowerCalculatorPage() {
  return (
    <Calculator
      title="Power Calculator"
      description="Stromverbrauch und Kosten berechnen"
      icon={<Plug className="w-16 h-16 text-white" />}
      gradient="from-green-500 to-emerald-500"
      fields={[
        {
          name: 'lights',
          label: 'Lampen-Watt',
          type: 'number',
          unit: 'W',
          defaultValue: 300,
          step: 10,
          min: 0,
        },
        {
          name: 'lightHours',
          label: 'Lampen-Stunden/Tag',
          type: 'number',
          unit: 'h',
          defaultValue: 18,
          step: 0.5,
          min: 0,
          max: 24,
        },
        {
          name: 'equipment',
          label: 'Zusätzliche Geräte',
          type: 'number',
          unit: 'W',
          defaultValue: 100,
          step: 10,
          min: 0,
          help: 'Lüfter, Pumpen, Heizung, etc. (läuft 24h)',
        },
        {
          name: 'price',
          label: 'Strompreis',
          type: 'number',
          unit: '€/kWh',
          defaultValue: 0.35,
          step: 0.01,
          min: 0,
        },
        {
          name: 'days',
          label: 'Laufzeit',
          type: 'number',
          unit: 'Tage',
          defaultValue: 90,
          step: 1,
          min: 1,
          help: 'Gesamtdauer des Grows',
        },
      ]}
      calculate={(values) => {
        const lights = values.lights as number;
        const lightHours = values.lightHours as number;
        const equipment = values.equipment as number;
        const price = values.price as number;
        const days = values.days as number;

        // kWh pro Tag
        const lightsKwhDay = (lights * lightHours) / 1000;
        const equipmentKwhDay = (equipment * 24) / 1000;
        const totalKwhDay = lightsKwhDay + equipmentKwhDay;

        // Total kWh
        const totalKwh = totalKwhDay * days;

        // Kosten
        const totalCost = totalKwh * price;

        // Rückgabe als String für custom Display
        return JSON.stringify({
          kwhDay: totalKwhDay.toFixed(2),
          kwhTotal: totalKwh.toFixed(2),
          costDay: (totalKwhDay * price).toFixed(2),
          costMonth: (totalKwhDay * 30 * price).toFixed(2),
          costTotal: totalCost.toFixed(2),
        });
      }}
      resultUnit=""
      resultLabel="Stromverbrauch & Kosten"
      info={{
        title: 'Stromkosten verstehen',
        content: (
          <div className="space-y-4">
            <p>
              Dieser Rechner berechnet deinen gesamten Stromverbrauch und die Kosten für deinen Grow. 
              Die Lampen laufen nur während der Photoperiode, während Lüfter & Co. 24h laufen.
            </p>
            <div className="rounded-lg border p-6">
              <h4 className="font-medium text-foreground mb-3">Beispiel-Rechnung:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-foreground">300W LED × 18h</strong> = 5.4 kWh/Tag (nur Lampe)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-foreground">100W Equipment × 24h</strong> = 2.4 kWh/Tag (Lüfter etc.)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-foreground">Gesamt:</strong> 7.8 kWh/Tag
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary">•</span>
                  <span>
                    <strong className="text-foreground">Bei 0.35€/kWh:</strong> 2.73€/Tag = ~82€/Monat
                  </span>
                </li>
              </ul>
            </div>
            <p>
              <strong className="text-foreground">Spartipp:</strong> LED-Lampen sind teurer in der Anschaffung,
              sparen aber langfristig durch höhere Effizienz viel Strom!
            </p>
          </div>
        ),
      }}
    />
  );
}

// Custom Result Display Component würde hier benötigt werden
// Aber für Einfachheit lassen wir den Standard-Display
