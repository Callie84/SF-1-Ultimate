'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'sf1_pwa_prompt_dismissed';

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Bereits dismissed → nicht zeigen
    if (localStorage.getItem(STORAGE_KEY)) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    if (isInStandaloneMode) return; // Bereits installiert

    if (isIos) {
      // iOS: kein beforeinstallprompt → Anleitung zeigen
      setShowIosGuide(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80 rounded-xl bg-[#1a1a2e] border border-green-500/30 shadow-2xl p-4">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-white"
        aria-label="Schließen"
      >
        <X className="w-4 h-4" />
      </button>

      {showIosGuide ? (
        <IosGuide onDismiss={dismiss} />
      ) : (
        <AndroidPrompt onInstall={handleInstall} onDismiss={dismiss} />
      )}
    </div>
  );
}

function AndroidPrompt({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192x192.png" alt="SeedFinderPro" className="w-10 h-10 rounded-xl" />
        <div>
          <p className="font-semibold text-white text-sm">App installieren</p>
          <p className="text-xs text-gray-400">SeedFinderPro als App speichern</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Schnellzugriff vom Homescreen, Offline-Nutzung und Push-Benachrichtigungen.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onInstall} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          <Download className="w-3 h-3 mr-1" />
          Installieren
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="text-gray-400 hover:text-white">
          Nicht jetzt
        </Button>
      </div>
    </div>
  );
}

function IosGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192x192.png" alt="SeedFinderPro" className="w-10 h-10 rounded-xl" />
        <div>
          <p className="font-semibold text-white text-sm">Zum Homescreen hinzufügen</p>
          <p className="text-xs text-gray-400">iOS-Anleitung</p>
        </div>
      </div>
      <ol className="text-xs text-gray-300 space-y-1.5 mb-3">
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
          <span>Tippe auf das <Share className="w-3 h-3 inline" /> Teilen-Symbol in Safari</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
          <span>Wähle <strong className="text-white">„Zum Home-Bildschirm"</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="shrink-0 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
          <span>Tippe auf <strong className="text-white">„Hinzufügen"</strong></span>
        </li>
      </ol>
      <Button size="sm" variant="ghost" onClick={onDismiss} className="w-full text-gray-400 hover:text-white text-xs">
        Verstanden
      </Button>
    </div>
  );
}
