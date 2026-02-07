'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { cn } from '@/lib/utils';
import {
  Brain,
  MessageSquare,
  Stethoscope,
  Lightbulb,
  Scissors,
  Wrench,
} from 'lucide-react';

const aiNavItems = [
  {
    name: 'Übersicht',
    href: '/ai',
    icon: Brain,
    description: 'Alle AI-Tools',
    exact: true,
  },
  {
    name: 'AI Chat',
    href: '/ai/chat',
    icon: MessageSquare,
    description: 'Fragen & Antworten',
  },
  {
    name: 'Diagnose',
    href: '/ai/diagnose',
    icon: Stethoscope,
    description: 'Probleme erkennen',
  },
  {
    name: 'Grow Advisor',
    href: '/ai/advisor',
    icon: Lightbulb,
    description: 'Personalisierte Tipps',
  },
];

export default function AiLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardLayout>
      <div className="flex h-full gap-6">
        {/* AI Sub-Navigation */}
        <aside className="w-56 flex-shrink-0 hidden lg:block">
          <div className="sticky top-0">
            <div className="mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Tools
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                KI-gestützte Grow-Hilfe
              </p>
            </div>

            <nav className="space-y-1">
              {aiNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname?.startsWith(item.href + '/');
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                      <div
                        className={cn(
                          'text-[11px] truncate',
                          isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/70'
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Info-Box */}
            <div className="mt-6 rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Alle AI-Funktionen nutzen <span className="font-semibold text-foreground">GPT-4o</span> für
                präzise Analysen und Empfehlungen.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile AI Navigation */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 -mx-6 px-6 mb-2 border-b w-[calc(100%+3rem)]">
          {aiNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-accent text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Page Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
}
