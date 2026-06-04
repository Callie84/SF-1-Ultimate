import type { MetadataRoute } from 'next';

const BASE_URL = 'https://seedfinderpro.de';
const COMMUNITY_URL = process.env.COMMUNITY_SERVICE_URL || 'http://sf1-community-service:3005';
const JOURNAL_URL = process.env.JOURNAL_SERVICE_URL || 'http://journal-service:3003';

async function getStrainSlugs(): Promise<string[]> {
  try {
    let allSlugs: string[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const res = await fetch(
        `${COMMUNITY_URL}/api/community/strains?page=${page}&limit=${limit}&active=true`,
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

async function getPublicGrowIds(): Promise<{ id: string; updatedAt?: string }[]> {
  try {
    let all: { id: string; updatedAt?: string }[] = [];
    let skip = 0;
    const limit = 100;
    while (true) {
      const res = await fetch(
        `${JOURNAL_URL}/api/journal/grows/public?limit=${limit}&skip=${skip}`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = await res.json();
      const grows = data.grows || [];
      all = [
        ...all,
        ...grows.map((g: any) => ({ id: g._id || g.id, updatedAt: g.updatedAt })),
      ];
      if (grows.length < limit) break;
      skip += limit;
    }
    return all;
  } catch {
    return [];
  }
}

async function getPublicThreadIds(): Promise<{ id: string; updatedAt?: string }[]> {
  try {
    let all: { id: string; updatedAt?: string }[] = [];
    let skip = 0;
    const limit = 100;
    while (true) {
      const res = await fetch(
        `${COMMUNITY_URL}/api/community/threads?limit=${limit}&skip=${skip}&sort=latest`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) break;
      const data = await res.json();
      const threads = data.threads || [];
      all = [
        ...all,
        ...threads.map((t: any) => ({ id: t._id || t.id, updatedAt: t.updatedAt })),
      ];
      if (threads.length < limit) break;
      skip += limit;
    }
    return all;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [strainSlugs, growIds, threadIds] = await Promise.all([
    getStrainSlugs(),
    getPublicGrowIds(),
    getPublicThreadIds(),
  ]);

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
      url: `${BASE_URL}/grows`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/seedbanks`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.75,
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

  const growPages: MetadataRoute.Sitemap = growIds.map(({ id, updatedAt }) => ({
    url: `${BASE_URL}/grows/${id}`,
    lastModified: updatedAt ? new Date(updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const threadPages: MetadataRoute.Sitemap = threadIds.map(({ id, updatedAt }) => ({
    url: `${BASE_URL}/community/thread/${id}`,
    lastModified: updatedAt ? new Date(updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.55,
  }));

  return [...staticPages, ...strainPages, ...growPages, ...threadPages];
}
