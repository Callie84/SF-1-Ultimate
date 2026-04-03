'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const THEMES = [
  { id: 'light',          label: 'Standard',        icon: '☀️',  desc: 'Helles Design' },
  { id: 'dark',           label: 'Dark Mode',        icon: '🌙',  desc: 'Dunkles Design' },
  { id: 'theme-nature',   label: 'Nature',           icon: '🌿',  desc: 'Grün & Weiß' },
  { id: 'theme-midnight', label: 'Midnight Grower',  icon: '🔮',  desc: 'Blau & Lila' },
  { id: 'theme-earth',    label: 'Earth',            icon: '🌱',  desc: 'Erdtöne' },
  { id: 'theme-neon',     label: 'Neon Grower',      icon: '⚡',  desc: 'Neon auf Schwarz' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all hover:border-primary ${
            theme === t.id
              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-1'
              : 'border-border'
          }`}
        >
          <span className="text-2xl">{t.icon}</span>
          <span className="text-xs font-semibold leading-tight">{t.label}</span>
          <span className="text-[10px] text-muted-foreground">{t.desc}</span>
        </button>
      ))}
    </div>
  );
}
