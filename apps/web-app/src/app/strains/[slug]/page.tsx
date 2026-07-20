import type { Metadata } from 'next';
import { StrainDetailClient } from './strain-detail-client';

const BASE_URL = 'https://seedfinderpro.de';
const COMMUNITY_URL =
  process.env.COMMUNITY_SERVICE_URL || 'http://sf1-community-service:3005';
const PRICE_URL =
  process.env.PRICE_SERVICE_URL || 'http://sf1-price-service:3002';

async function fetchStrain(slug: string) {
  try {
    const res = await fetch(`${COMMUNITY_URL}/api/community/strains/${slug}`, {
      next: { revalidate: 3600 },
    });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function fetchReviews(slug: string) {
  try {
    const res = await fetch(
      `${COMMUNITY_URL}/api/community/strains/${slug}/reviews`,
      { next: { revalidate: 3600 } }
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

async function fetchSeeds(name: string) {
  if (!name || name.length < 2) return null;
  try {
    const res = await fetch(
      `${PRICE_URL}/api/prices/search?q=${encodeURIComponent(name)}&limit=20`,
      { next: { revalidate: 3600 } }
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const strain = await fetchStrain(params.slug);
  if (!strain) return { title: 'Strain Details' };

  const title = `${strain.name} — Cannabis Strain`;
  const desc = strain.description
    ? strain.description.slice(0, 155)
    : `${strain.name} — Typ: ${strain.type}. THC: ${strain.thc ?? '–'}%, CBD: ${strain.cbd ?? '–'}%. Jetzt Preise vergleichen auf SeedFinderPro.`;

  const ogImageUrl = `${BASE_URL}/api/og?type=Strain&title=${encodeURIComponent(title)}&sub=${encodeURIComponent(`THC: ${strain.thc ?? '–'}% · CBD: ${strain.cbd ?? '–'}% · ${strain.type ?? ''}`)}`;
  const ogImage = strain.imageUrl
    ? { url: strain.imageUrl, alt: strain.name }
    : { url: ogImageUrl, width: 1200, height: 630, alt: title };

  return {
    title,
    description: desc,
    alternates: {
      canonical: `${BASE_URL}/strains/${params.slug}`,
    },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/strains/${params.slug}`,
      type: 'website',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [strain.imageUrl || ogImageUrl],
    },
  };
}

export default async function StrainDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const [strain, reviews] = await Promise.all([
    fetchStrain(params.slug),
    fetchReviews(params.slug),
  ]);

  // Seed-Preise server-seitig holen (braucht den Strain-Namen) — damit die
  // Preistabelle bereits im HTML steht (SEO), nicht erst client-seitig lädt.
  const seeds = strain ? await fetchSeeds(strain.name) : null;

  let jsonLd: object | null = null;

  if (strain) {
    const graph: object[] = [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cannabis Strains',
            item: `${BASE_URL}/strains`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: strain.name,
            item: `${BASE_URL}/strains/${params.slug}`,
          },
        ],
      },
      {
        '@type': 'Product',
        name: strain.name,
        ...(strain.description ? { description: strain.description } : {}),
        ...(strain.imageUrl ? { image: strain.imageUrl } : {}),
        ...(strain.breeder
          ? { brand: { '@type': 'Brand', name: strain.breeder } }
          : {}),
        additionalProperty: [
          ...(strain.thc != null
            ? [{ '@type': 'PropertyValue', name: 'THC', value: `${strain.thc}%` }]
            : []),
          ...(strain.cbd != null
            ? [{ '@type': 'PropertyValue', name: 'CBD', value: `${strain.cbd}%` }]
            : []),
          ...(strain.type
            ? [{ '@type': 'PropertyValue', name: 'Typ', value: strain.type }]
            : []),
        ],
        ...(reviews?.avgRating && reviews.count > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(reviews.avgRating).toFixed(1),
                reviewCount: reviews.count,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          availability: 'https://schema.org/InStock',
          url: `${BASE_URL}/strains/${params.slug}`,
        },
      },
    ];

    jsonLd = { '@context': 'https://schema.org', '@graph': graph };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <StrainDetailClient
        slug={params.slug}
        initialStrain={strain ?? undefined}
        initialReviews={reviews ?? undefined}
        initialSeeds={seeds ?? undefined}
      />
    </>
  );
}
