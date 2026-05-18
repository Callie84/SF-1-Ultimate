import type { Metadata } from 'next';
import { ThreadDetailClient } from './thread-detail-client';

const BASE_URL = 'https://seedfinderpro.de';
const COMMUNITY_SERVICE_URL =
  process.env.COMMUNITY_SERVICE_URL || 'http://community-service:3005';

async function fetchThread(id: string) {
  try {
    const res = await fetch(
      `${COMMUNITY_SERVICE_URL}/api/community/threads/${id}`,
      { next: { revalidate: 3600 } }
    );
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await fetchThread(params.id);
  const thread = data?.thread;
  if (!thread) return { title: 'Community Thread' };

  const title = thread.title;
  const desc = thread.content
    ? thread.content.slice(0, 155)
    : `Community-Diskussion: ${thread.title} — SeedFinderPro Cannabis Growing Community.`;

  const ogImageUrl = `${BASE_URL}/api/og?type=Thread&title=${encodeURIComponent(title)}&sub=${encodeURIComponent(desc.slice(0, 80))}`;

  return {
    title,
    description: desc,
    alternates: {
      canonical: `${BASE_URL}/community/thread/${params.id}`,
    },
    openGraph: {
      title,
      description: desc,
      url: `${BASE_URL}/community/thread/${params.id}`,
      type: 'article',
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

export default async function ThreadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await fetchThread(params.id);
  const thread = data?.thread;

  let jsonLd: object | null = null;

  if (thread) {
    jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Community',
              item: `${BASE_URL}/community`,
            },
            ...(thread.category
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: thread.category.name,
                    item: `${BASE_URL}/community/${thread.category.slug}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: thread.title,
                    item: `${BASE_URL}/community/thread/${params.id}`,
                  },
                ]
              : [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: thread.title,
                    item: `${BASE_URL}/community/thread/${params.id}`,
                  },
                ]),
          ],
        },
        {
          '@type': 'DiscussionForumPosting',
          headline: thread.title,
          ...(thread.content ? { text: thread.content.slice(0, 500) } : {}),
          ...(thread.createdAt
            ? { datePublished: new Date(thread.createdAt).toISOString() }
            : {}),
          url: `${BASE_URL}/community/thread/${params.id}`,
          ...(thread.user?.username
            ? {
                author: {
                  '@type': 'Person',
                  name: thread.user.username,
                },
              }
            : {}),
          interactionStatistic: [
            {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/ReplyAction',
              userInteractionCount: thread.replyCount || 0,
            },
          ],
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
      <ThreadDetailClient />
    </>
  );
}
