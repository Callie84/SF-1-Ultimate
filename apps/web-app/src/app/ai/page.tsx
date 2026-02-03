'use client';

import Link from 'next/link';
import { MessageSquare, Stethoscope, Lightbulb } from 'lucide-react';

const aiTools = [
  {
    title: 'AI Chat',
    description: 'Chatte mit unserem AI-Assistenten über alles rund um Cannabis-Anbau',
    href: '/ai/chat',
    icon: MessageSquare,
    color: 'bg-blue-500',
  },
  {
    title: 'Pflanzen-Diagnose',
    description: 'Lade ein Foto hoch und lass die AI Probleme erkennen',
    href: '/ai/diagnose',
    icon: Stethoscope,
    color: 'bg-green-500',
  },
  {
    title: 'Grow-Advisor',
    description: 'Personalisierte Empfehlungen für deinen Grow',
    href: '/ai/advisor',
    icon: Lightbulb,
    color: 'bg-amber-500',
  },
];

export default function AiPage() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">AI Tools</h1>
        <p className="mt-2 text-muted-foreground">
          Nutze unsere AI-powered Tools für bessere Grows
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
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
            <p className="text-sm text-muted-foreground">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
