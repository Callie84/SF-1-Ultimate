'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

const STORAGE_KEY = 'sf1_age_verified';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export function AgeGateModal() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
      return;
    }
    const timestamp = parseInt(stored, 10);
    if (Date.now() - timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      setVisible(true);
    }
  }, []);

  function handleConfirm() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setVisible(false);
  }

  function handleDeny() {
    window.location.href = 'about:blank';
  }

  if (!mounted || !visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-xl border bg-card p-8 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Altersverifikation</h2>
          <p className="text-sm text-muted-foreground">
            Diese Website richtet sich ausschließlich an Erwachsene. Bist du 18 Jahre oder älter?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={handleConfirm} className="w-full">
            Ja, ich bin 18 Jahre oder älter
          </Button>
          <Button onClick={handleDeny} variant="ghost" className="w-full text-muted-foreground">
            Nein, ich bin unter 18
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gemäß § 5 JMStV ist diese Website nur für Personen ab 18 Jahren bestimmt.
        </p>
      </div>
    </div>
  );
}
