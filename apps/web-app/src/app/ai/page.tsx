'use client';

import Link from 'next/link';
import { MessageSquare, Stethoscope, Lightbulb, ArrowRight, Sparkles } from 'lucide-react';

const aiTools = [
  {
    title: 'AI Chat',
    description: 'Chatte mit unserem AI-Assistenten über alles rund um Cannabis-Anbau. Stelle Fragen und erhalte sofort Antworten.',
    href: '/ai/chat',
    icon: MessageSquare,
    color: 'bg-blue-500',
    features: ['Fragen & Antworten', 'Grow-Tipps', 'Session-Verlauf'],
  },
  {
    title: 'Pflanzen-Diagnose',
    description: 'Lade ein Foto hoch und lass die AI Probleme erkennen. Erhalte Ursachen und Lösungsvorschläge.',
    href: '/ai/diagnose',
    icon: Stethoscope,
    color: 'bg-green-500',
    features: ['Bild-Analyse', 'Schnell-Diagnose', 'Lösungsvorschläge'],
  },
  {
    title: 'Grow Advisor',
    description: 'Personalisierte Empfehlungen für deinen Grow - Strain-Auswahl, Setup-Tipps und Timeline.',
    href: '/ai/advisor',
    icon: Lightbulb,
    color: 'bg-amber-500',
    features: ['Strain-Empfehlungen', 'Setup-Tipps', 'Grow-Timeline'],
  },
];

export default function AiPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">AI Tools</h1>
        </div>
        <p className="text-muted-foreground">
          Nutze unsere KI-gestützten Tools für bessere Grows. Powered by GPT-4o.
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {aiTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-xl border bg-card p-6 transition-all hover:border-primary hover:shadow-lg"
          >
            <div className={`mb-4 inline-flex rounded-lg ${tool.color} p-3`}>
              <tool.icon className="h-6 w-6 text-white" />
            </div>
            <h2 className="mb-2 text-xl font-semibold group-hover:text-primary">
              {tool.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {tool.description}
            </p>

            {/* Features */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tool.features.map((feature) => (
                <span
                  key={feature}
                  className="text-xs bg-accent px-2 py-1 rounded-md text-muted-foreground"
                >
                  {feature}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Öffnen
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold mb-2">Wie funktioniert es?</h3>
        <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="text-primary font-bold">1.</span>
            <span>Wähle ein Tool aus der Navigation links oder den Karten oben.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-primary font-bold">2.</span>
            <span>Gib deine Frage ein, lade Bilder hoch oder fülle das Formular aus.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-primary font-bold">3.</span>
            <span>Erhalte in Sekunden eine KI-gestützte Analyse mit konkreten Tipps.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
