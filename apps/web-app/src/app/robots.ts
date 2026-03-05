import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/dashboard/',
          '/journal/',
          '/settings/',
          '/messages/',
          '/notifications/',
          '/profile/',
        ],
      },
    ],
    sitemap: 'https://seedfinderpro.de/sitemap.xml',
  };
}
