'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/providers/auth-provider';
import api from '@/lib/api-client';

const ITEMS = [
  { id: 'profile', label: 'Profil vervollständigen', href: '/settings' },
  { id: 'grow', label: 'Ersten Grow anlegen', href: '/journal/new' },
  { id: 'entry', label: 'Ersten Tagebuch-Eintrag erstellen', href: '/journal' },
  { id: 'community', label: 'Im Forum mitmachen', href: '/community' },
  { id: 'prices', label: 'Samenpreise vergleichen', href: '/prices' },
];

const STORAGE_KEY = 'sf1_onboarding_checklist_dismissed';
const ITEMS_KEY = 'sf1_onboarding_items';

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Bereits abgehakte Items aus localStorage laden
    const saved = localStorage.getItem(ITEMS_KEY);
    if (saved) {
      try { setChecked(JSON.parse(saved)); } catch { /* ignore */ }
    }

    // Zeige Checklist nur wenn Onboarding noch nicht abgeschlossen
    api
      .get('/api/auth/onboarding')
      .then((data: any) => {
        if (!data.onboardingCompleted) setVisible(true);
      })
      .catch(() => {});
  }, [user]);

  const toggle = (id: string) => {
    const next = checked.includes(id)
      ? checked.filter((c) => c !== id)
      : [...checked, id];
    setChecked(next);
    localStorage.setItem(ITEMS_KEY, JSON.stringify(next));

    // Alle abgehakt → automatisch ausblenden
    if (next.length === ITEMS.length) {
      api
        .put('/api/auth/onboarding', { step: ITEMS.length, completed: true })
        .catch(() => {});
      setTimeout(() => dismiss(), 1500);
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  const done = checked.length;
  const total = ITEMS.length;
  const pct = Math.round((done / total) * 100);

  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-green-400 flex items-center gap-2">
            Erste Schritte
            <span className="text-xs font-normal text-gray-400">{done}/{total}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="text-gray-500 hover:text-white p-1"
              aria-label="Ein-/Ausklappen"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              onClick={dismiss}
              className="text-gray-500 hover:text-white p-1"
              aria-label="Schließen"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
        {/* Fortschrittsbalken */}
        <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-2 pb-3">
          <ul className="space-y-1.5">
            {ITEMS.map((item) => {
              const isDone = checked.includes(item.id);
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => toggle(item.id)} className="shrink-0 text-green-500 hover:text-green-400">
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <Circle className="w-4 h-4 text-gray-500" />}
                  </button>
                  <Link
                    href={item.href}
                    className={`hover:text-white transition-colors ${isDone ? 'line-through text-gray-600' : 'text-gray-300'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
