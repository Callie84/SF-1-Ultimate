// apps/web-app/src/hooks/use-feature-flags.ts
// Feature-Flags von Unleash via /api/flags — gecacht mit React Query
import { useQuery } from '@tanstack/react-query';

export type FeatureFlags = {
  new_onboarding_flow: boolean;
  push_notifications: boolean;
  ai_chat_v2: boolean;
  premium_features: boolean;
  [key: string]: boolean;
};

const DEFAULT_FLAGS: FeatureFlags = {
  new_onboarding_flow: true,
  push_notifications: false,
  ai_chat_v2: false,
  premium_features: false,
};

async function fetchFlags(): Promise<FeatureFlags> {
  const res = await fetch('/api/flags', { cache: 'no-store' });
  if (!res.ok) return DEFAULT_FLAGS;
  const data = await res.json();
  return { ...DEFAULT_FLAGS, ...data.flags };
}

export function useFeatureFlags() {
  const { data } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFlags,
    staleTime: 30_000,     // 30 Sekunden
    gcTime: 5 * 60_000,    // 5 Minuten im Cache
    placeholderData: DEFAULT_FLAGS,
  });

  return data ?? DEFAULT_FLAGS;
}

export function useFeatureFlag(name: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[name] ?? false;
}
