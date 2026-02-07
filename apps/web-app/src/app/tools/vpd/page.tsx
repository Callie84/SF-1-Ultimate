'use client';

import { useState } from 'react';
import { Droplets, Info } from 'lucide-react';

export default function VPDCalculatorPage() {
  const [temp, setTemp] = useState<number>(24);
  const [humidity, setHumidity] = useState<number>(60);
  const [leafOffset, setLeafOffset] = useState<number>(2);
  const [result, setResult] = useState<number | null>(null);

  const calculateVPD = () => {
    const leafTemp = temp - leafOffset;
    const svpAir = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const svpLeaf = 0.61078 * Math.exp((17.27 * leafTemp) / (leafTemp + 237.3));
    const vpd = svpLeaf - (humidity / 100) * svpAir;
    setResult(vpd);
  };

  const getVPDStatus = (vpd: number) => {
    if (vpd < 0.4) return { text: 'Zu niedrig', color: 'text-blue-400', desc: 'Erhohe Temperatur oder senke Luftfeuchtigkeit' };
    if (vpd < 0.8) return { text: 'Vegetativ optimal', color: 'text-green-500', desc: 'Perfekt fur Wachstumsphase' };
    if (vpd < 1.2) return { text: 'Blute optimal', color: 'text-emerald-500', desc: 'Perfekt fur Blutephase' };
    if (vpd < 1.6) return { text: 'Erhoht', color: 'text-yellow-500', desc: 'Noch ok, aber an der oberen Grenze' };
    return { text: 'Zu hoch', color: 'text-red-500', desc: 'Senke Temperatur oder erhohe Luftfeuchtigkeit' };
  };

  const status = result !== null ? getVPDStatus(result) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Droplets className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">VPD Calculator</h1>
        </div>
        <p className="text-muted-foreground">
          Vapor Pressure Deficit - Optimale Luftfeuchtigkeit
        </p>
      </div>

      {/* Calculator */}
      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Lufttemperatur (°C)
            </label>
            <input
              type="number"
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Relative Luftfeuchtigkeit (%)
            </label>
            <input
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              step="1"
              min="0"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">
              Blatt-Temperatur-Offset (°C)
            </label>
            <input
              type="number"
              value={leafOffset}
              onChange={(e) => setLeafOffset(Number(e.target.value))}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              step="0.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Standard: 2°C (Blatter sind meist kuhler als Luft)
            </p>
          </div>

          <button
            onClick={calculateVPD}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Berechnen
          </button>
        </div>
      </div>

      {/* Result */}
      {result !== null && status && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">Ergebnis</h3>
          <div className="rounded-lg border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-1">
              {result.toFixed(2)} kPa
            </div>
            <div className={`text-lg font-bold ${status.color} mt-2`}>
              {status.text}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {status.desc}
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Was ist VPD?
        </h3>
        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            VPD (Vapor Pressure Deficit) misst den Unterschied zwischen der Feuchtigkeit in der Luft
            und der Feuchtigkeit, die die Luft maximal aufnehmen kann. Es ist ein wichtiger Indikator
            fur die Transpiration deiner Pflanzen.
          </p>
          <div className="rounded-lg border p-4">
            <h4 className="font-medium text-foreground mb-2">Optimale Werte:</h4>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">Setzlinge:</strong> 0.4 - 0.8 kPa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">Vegetativ:</strong> 0.8 - 1.2 kPa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><strong className="text-foreground">Blute:</strong> 1.0 - 1.5 kPa</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
