// /apps/journal-service/src/services/search-client.ts
import { logger } from '../utils/logger';

const SEARCH_URL = process.env.SEARCH_SERVICE_URL || 'http://sf1-search-service:3007';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

interface GrowDocument {
  id: string;
  strainName: string;
  breeder?: string;
  userId: string;
  status: string;
  environment: string;
  type: string;
  isPublic: boolean;
  tags?: string[];
  yieldDry?: number;
  notes?: string;
  viewCount?: number;
  createdAt: Date | string;
}

export function toGrowDocument(grow: any): GrowDocument {
  return {
    id: grow._id.toString(),
    strainName: grow.strainName,
    breeder: grow.breeder,
    userId: grow.userId,
    status: grow.status,
    environment: grow.environment,
    type: grow.type,
    isPublic: grow.isPublic,
    tags: grow.tags,
    yieldDry: grow.yieldDry,
    notes: grow.entries?.[0]?.notes,
    viewCount: grow.viewCount,
    createdAt: grow.createdAt,
  };
}

export async function indexGrow(grow: any): Promise<void> {
  try {
    const document = toGrowDocument(grow);
    await fetch(`${SEARCH_URL}/api/search/internal/grows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ action: 'index', document }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    logger.warn(`[SearchClient] Failed to index grow: ${err}`);
  }
}

export async function deleteGrowFromIndex(growId: string): Promise<void> {
  try {
    await fetch(`${SEARCH_URL}/api/search/internal/grows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ action: 'delete', id: growId }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    logger.warn(`[SearchClient] Failed to delete grow from index: ${err}`);
  }
}
