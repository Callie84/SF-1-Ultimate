'use client';

import { Calculator, Droplets, Sun, Zap, Plug, Wind, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const tools = [
  {
    id: 'vpd',
    name: 'VPD Calculator',
    description: 'Vapor Pressure Deficit - Optimale Luftfeuchtigkeit berechnen',
    icon: Droplets,
    color: 'bg-blue-500',
    href: '/tools/vpd',
  },
  {
    id: 'ec',
    name: 'EC Calculator',
    description: 'Electrical Conductivity - Nahrstoffkonzentration berechnen',
    icon: Zap,
    color: 'bg-yellow-500',
    href: '/tools/ec',
  },
  {
    id: 'dli',
    name: 'DLI Calculator',
    description: 'Daily Light Integral - Tagliche Lichtmenge berechnen',
    icon: Sun,
    color: 'bg-orange-500',
    href: '/tools/dli',
  },
  {
    id: 'ppfd',
    name: 'PPFD Calculator',
    description: 'Photosynthetic Photon Flux Density - Lichtintensitat berechnen',
    icon: Sun,
    color: 'bg-purple-500',
    href: '/tools/ppfd',
  },
  {
    id: 'power',
    name: 'Power Calculator',
    description: 'Stromverbrauch und Kosten berechnen',
    icon: Plug,
    color: 'bg-green-500',
    href: '/tools/power',
  },
  {
    id: 'co2',
    name: 'CO2 Calculator',
    description: 'CO2-Bedarf fur optimales Wachstum berechnen',
    icon: Wind,
    color: 'bg-teal-500',
    href: '/tools/co2',
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Cannabis-Rechner</h1>
        </div>
        <p className="text-muted-foreground">
          Wissenschaftliche Tools fur deinen perfekten Grow
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="group rounded-xl border bg-card p-5 transition-all hover:border-primary hover:shadow-lg"
            >
              <div className={`mb-3 inline-flex rounded-lg ${tool.color} p-2.5`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1 group-hover:text-primary">{tool.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {tool.description}
              </p>
              <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Offnen
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-2">Uber diese Tools</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Diese wissenschaftlichen Rechner helfen dir, optimale Wachstumsbedingungen zu schaffen.
            Alle Formeln basieren auf wissenschaftlichen Standards und jahrelanger Praxis.
          </p>
          <p>
            <strong className="text-foreground">Wichtig:</strong> Die Ergebnisse sind Richtwerte.
            Jede Strain und jedes Setup ist unterschiedlich. Beobachte deine Pflanzen und passe
            die Werte an ihre Bedurfnisse an.
          </p>
        </div>
      </div>
    </div>
  );
}
