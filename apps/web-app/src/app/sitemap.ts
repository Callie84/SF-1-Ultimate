import type { MetadataRoute } from 'next';

const BASE_URL = 'https://seedfinderpro.de';

async function getStrainSlugs(): Promise<string[]> {
  try {
    // Fetch all strains from community-service (server-side, direct service call)
    const communityServiceUrl = process.env.COMMUNITY_SERVICE_URL || 'http://community-service:3005';
    let allSlugs: string[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const res = await fetch(
        `${communityServiceUrl}/api/community/strains?page=${page}&limit=${limit}&active=true`,
        { next: { revalidate: 3600 } } // cache 1 hour
      );
      if (!res.ok) break;

      const data = await res.json();
      const slugs = (data.strains || []).map((s: any) => s.slug).filter(Boolean);
      allSlugs = [...allSlugs, ...slugs];

      if (!data.pagination || page >= data.pagination.pages) break;
      page++;
    }

    return allSlugs;
  } catch (err) {
    console.error('[sitemap] Failed to fetch strains:', err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const strainSlugs = await getStrainSlugs();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/strains`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/prices`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/community`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/tools`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/tools/vpd`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/tools/ec`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/tools/dli`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/tools/ppfd`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/tools/co2`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/tools/power`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const strainPages: MetadataRoute.Sitemap = strainSlugs.map((slug) => ({
    url: `${BASE_URL}/strains/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...strainPages];
}
