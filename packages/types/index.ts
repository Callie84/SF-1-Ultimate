/**
 * SF-1 Ultimate — Shared TypeScript Types
 *
 * Diese Typen spiegeln die tatsächlichen API-Antworten der Backend-Services wider.
 * Sie werden direkt in apps/web-app/src/types/ verwendet.
 *
 * Für künftige Monorepo-Konvertierung: Root package.json mit workspaces anlegen,
 * dann "@sf1/types" in web-app/package.json referenzieren.
 */

// Re-Export aller Typen aus den Frontend-Type-Dateien
export type { User, AuthTokens, LoginRequest, RegisterRequest, AuthResponse } from '../../apps/web-app/src/types/auth';
export type { Grow, Entry, GrowComment, GrowReaction, ApiGrow, ApiEntry, CreateEntryData } from '../../apps/web-app/src/types/journal';
export type { Thread, Reply, Category, Vote, ApiThread, ApiReply, ThreadListResponse, ThreadDetailResponse, ReplyListResponse } from '../../apps/web-app/src/types/community';
export type { Strain, Seedbank, Price } from '../../apps/web-app/src/types/price';
