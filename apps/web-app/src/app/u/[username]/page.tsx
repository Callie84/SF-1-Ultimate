// /apps/web-app/src/app/u/[username]/page.tsx
// Server Component — OG-Metadata + öffentliche Profil-Seite (kein Login nötig)

import type { Metadata } from 'next';
import { PublicProfileClient } from './PublicProfileClient';

interface Props {
  params: { username: string };
}

interface PublicProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(
      `${process.env.AUTH_SERVICE_URL}/api/auth/users/${encodeURIComponent(username)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await fetchPublicProfile(params.username);

  if (!profile) {
    return {
      title: 'Benutzer nicht gefunden',
      description: 'Dieser Nutzer existiert nicht auf SeedFinderPro.',
    };
  }

  const displayName = profile.displayName || profile.username;
  const description =
    profile.bio ||
    `${displayName} auf SeedFinderPro — Cannabis Grow Journal & Community`;
  const ogImageUrl = profile.avatar || undefined;

  return {
    title: `${displayName} (@${profile.username})`,
    description,
    openGraph: {
      title: `${displayName} (@${profile.username}) – SeedFinderPro`,
      description,
      url: `/u/${profile.username}`,
      type: 'profile',
      ...(ogImageUrl && {
        images: [{ url: ogImageUrl, width: 400, height: 400, alt: displayName }],
      }),
    },
    twitter: {
      card: 'summary',
      title: `${displayName} (@${profile.username}) – SeedFinderPro`,
      description,
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
    alternates: {
      canonical: `/u/${profile.username}`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await fetchPublicProfile(params.username);
  return <PublicProfileClient username={params.username} initialProfile={profile} />;
}
