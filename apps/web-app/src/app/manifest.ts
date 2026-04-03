import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SeedFinderPro',
    short_name: 'SeedFinderPro',
    description: 'Cannabis Samen Preisvergleich, Strain-Datenbank & Grow-Community',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f1a',
    theme_color: '#1a1a2e',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
    categories: ['lifestyle', 'social', 'utilities'],
  };
}
