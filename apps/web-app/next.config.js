/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js + React benötigen unsafe-eval/inline für hydration
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      // Bilder: eigener S3, CDN, YouTube-Thumbnails, Data-URIs
      "img-src 'self' data: blob: https://fsn1.your-objectstorage.com https://sf1-uploads.fsn1.your-objectstorage.com https://cdn.seedfinderpro.de https://img.youtube.com https://i.ytimg.com",
      // API-Calls: eigene Domain + Sentry
      "connect-src 'self' https://seedfinderpro.de https://www.seedfinderpro.de https://*.sentry.io wss://seedfinderpro.de",
      // Videos, Medien: eigener S3
      "media-src 'self' https://fsn1.your-objectstorage.com https://cdn.seedfinderpro.de",
      // iFrames: nur YouTube (für Video-Feature Session 48)
      "frame-src 'self' https://www.youtube.com https://js.stripe.com",
      "font-src 'self'",
      // Verhindert Plugin-Exploits
      "object-src 'none'",
      // Basis-URI einschränken
      "base-uri 'self'",
      // Form-Actions nur auf eigene Domain
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/datenschutz', destination: '/privacy', permanent: true },
      { source: '/agb', destination: '/terms', permanent: true },
      { source: '/login', destination: '/auth/login', permanent: true },
      { source: '/register', destination: '/auth/register', permanent: true },
      // Öffentliche Profil-URLs: /profile/:username → /u/:username (SEO-Konsolidierung)
      { source: '/profile/:username', destination: '/u/:username', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Hetzner Object Storage
      {
        protocol: 'https',
        hostname: 'fsn1.your-objectstorage.com',
        pathname: '/sf1-uploads/**',
      },
      // Cloudflare CDN (wenn eingerichtet)
      {
        protocol: 'https',
        hostname: 'cdn.seedfinderpro.de',
      },
      // Legacy / externe Bilder
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
    // Formate: WebP + AVIF für moderne Browser
    formats: ['image/avif', 'image/webp'],
    // Minimale Cache-Zeit für optimierte Bilder: 7 Tage
    minimumCacheTTL: 604800,
  },
  // NEXT_PUBLIC_* Variablen werden automatisch von Next.js exponiert
  // Leerer String = relative URLs (für Production)
};

module.exports = withSentryConfig(withPWA(nextConfig), {
  org: 'o4510525545512960',
  project: 'sf1-frontend',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
