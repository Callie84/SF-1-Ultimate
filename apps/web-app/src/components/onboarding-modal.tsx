'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, BookOpen, Users, Sparkles, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { useFeatureFlag } from '@/hooks/use-feature-flags';
import api from '@/lib/api-client';

const STEPS = [
  {
    icon: Leaf,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    title: 'Willkommen bei SeedFinderPro! 🌱',
    description:
      'Die Community für Cannabis-Grower: Vergleiche Samenpreise, führe dein Grow-Tagebuch und tausch dich mit anderen Growern aus.',
    action: null,
  },
  {
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Dein Grow-Tagebuch',
    description:
      'Dokumentiere jeden Grow mit Fotos, Messwerten und Notizen. Verknüpfe Strains, erstelle Feeding-Pläne und sieh deinen Fortschritt auf einen Blick.',
    action: { label: 'Ersten Grow anlegen', href: '/journal/new' },
  },
  {
    icon: Users,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    title: 'Die Grower-Community',
    description:
      'Stell Fragen, teile deine Erfahrungen und lerne von anderen Growern. Das Forum ist dein Ort für Tipps, Hilfe und Diskussionen.',
    action: { label: 'Community erkunden', href: '/community' },
  },
  {
    icon: Sparkles,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    title: 'Alles bereit!',
    description:
      'Du bist startklar. Schau dir die Strain-Datenbank an, vergleiche Samenpreise oder starte direkt mit deinem ersten Grow.',
    action: { label: 'Zum Dashboard', href: '/dashboard' },
  },
];

const STORAGE_KEY = 'sf1_onboarding_done';

export function OnboardingModal() {
  const { user } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const onboardingEnabled = useFeatureFlag('new_onboarding_flow');

  useEffect(() => {
    if (!user) return;
    // Feature-Flag: Onboarding-Flow deaktiviert → kein Modal
    if (!onboardingEnabled) return;
    // Lokale Kurzprüfung — spart einen API-Call wenn bereits done
    if (localStorage.getItem(STORAGE_KEY)) return;

    api
      .get('/api/auth/onboarding')
      .then((data: any) => {
        if (!data.onboardingCompleted) {
          setStep(data.onboardingStep ?? 0);
          setVisible(true);
        } else {
          localStorage.setItem(STORAGE_KEY, '1');
        }
      })
      .catch(() => {});
  }, [user, onboardingEnabled]);

  const saveStep = async (nextStep: number, completed = false) => {
    setSaving(true);
    try {
      await api.put('/api/auth/onboarding', { step: nextStep, completed });
    } catch {
      /* ignorieren — UX darf nicht hängen */
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const next = step + 1;
    if (next >= STEPS.length) {
      await saveStep(STEPS.length, true);
      localStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
      return;
    }
    setStep(next);
    await saveStep(next);
  };

  const handleSkip = async () => {
    await saveStep(STEPS.length, true);
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const handleAction = async (href: string) => {
    await handleNext();
    router.push(href);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-2xl p-6">
        {/* Schließen */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          aria-label="Überspringen"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Schritt-Indikator */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-green-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border ${current.bg} mb-4`}>
          <Icon className={`w-7 h-7 ${current.color}`} />
        </div>

        {/* Inhalt */}
        <h2 className="text-xl font-bold text-white mb-2">{current.title}</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">{current.description}</p>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          {current.action && (
            <Button
              onClick={() => handleAction(current.action!.href)}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {current.action.label}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={saving}
            variant={current.action ? 'ghost' : 'default'}
            className={current.action ? 'w-full text-gray-400 hover:text-white' : 'w-full bg-green-600 hover:bg-green-700 text-white'}
          >
            {isLast ? 'Los geht\'s!' : 'Weiter'}
            {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
          {step === 0 && (
            <button
              onClick={handleSkip}
              className="text-xs text-gray-500 hover:text-gray-400 text-center py-1"
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
