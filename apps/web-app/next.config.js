/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  // NEXT_PUBLIC_* Variablen werden automatisch von Next.js exponiert
  // Leerer String = relative URLs (für Production)
};

module.exports = nextConfig;
