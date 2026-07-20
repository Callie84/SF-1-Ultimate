import type { Metadata } from 'next';
import { GrowDetailClient } from './grow-detail-client';

const BASE_URL = 'https://seedfinderpro.de';
const JOURNAL_SERVICE_URL =
  process.env.JOURNAL_SERVICE_URL || 'http://journal-service:3003';

async function fetchGrow(id: string) {
  try {
    const res = await fetch(`${JOURNAL_SERVICE_URL}/api/journal/grows/${id}`, {
      next: { revalidate: 3600 },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchGrow(id);
  const grow = data?.grow;
  if (!grow) return { title: 'Grow-Tagebuch' };

  const strainName = grow.strainName || 'Cannabis Grow';
  const env =
    grow.environment === 'indoor'
      ? 'Indoor'
      : grow.environment === 'outdoor'
        ? 'Outdoor'
        : 'Greenhouse';
  const title = `${strainName} — ${env} Grow-Tagebuch`;
  const desc = grow.description
    ? grow.description.slice(0, 155)
    : `${strainName} ${env}-Grow auf SeedFinderPro. ${grow.status ? `Status: ${grow.status}.` : ''} Grow-Tagebuch der Community.`;

  const ogImageUrl = `${BASE_URL}/api/og?type=Grow&title=${encodeURIComponent(title)}&sub=${encodeURIComponent(grow.username ? `von ${grow.username}` : '')}`;

  return {
    title,
    description: desc,
    alternates: {
      canonical: `${BASE_URL}/grows/${id}`,
    },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/grows/${id}`,
      type: 'website',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImageUrl],
    },
  };
}

export default async function GrowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchGrow(id);
  const grow = data?.grow;

  let jsonLd: object | null = null;

  if (grow) {
    const strainName = grow.strainName || 'Cannabis Grow';
    const env =
      grow.environment === 'indoor'
        ? 'Indoor'
        : grow.environment === 'outdoor'
          ? 'Outdoor'
          : 'Greenhouse';

    jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Grow-Tagebücher',
              item: `${BASE_URL}/grows`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: `${strainName} ${env}`,
              item: `${BASE_URL}/grows/${id}`,
            },
          ],
        },
        {
          '@type': 'BlogPosting',
          headline: `${strainName} — ${env} Grow-Tagebuch`,
          ...(grow.description ? { description: grow.description } : {}),
          ...(grow.startDate
            ? { datePublished: new Date(grow.startDate).toISOString() }
            : {}),
          url: `${BASE_URL}/grows/${id}`,
        },
      ],
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <GrowDetailClient />
    </>
  );
}
