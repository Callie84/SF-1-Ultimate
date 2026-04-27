import axios from 'axios';

// Docker internal IPs — services are not exposed on localhost ports
// Use SF1_AUTH_BASE etc. env vars to override (e.g. in CI with port-forwarding)
const AUTH_BASE   = process.env.SF1_AUTH_BASE   || 'http://172.17.0.23:3001';
const COMM_BASE   = process.env.SF1_COMM_BASE   || 'http://172.17.0.20:3005';
const JOURN_BASE  = process.env.SF1_JOURN_BASE  || 'http://172.17.0.25:3003';
const MEDIA_BASE  = process.env.SF1_MEDIA_BASE  || 'http://172.17.0.18:3007';
const PRICE_BASE  = process.env.SF1_PRICE_BASE  || 'http://172.17.0.26:3008';
const GAM_BASE    = process.env.SF1_GAM_BASE    || 'http://172.17.0.24:3009';
const SEARCH_BASE = process.env.SF1_SEARCH_BASE || 'http://172.17.0.29:3010';
const BACKUP_BASE = process.env.SF1_BACKUP_BASE || 'http://172.17.0.17:3011';
const TOOLS_BASE  = process.env.SF1_TOOLS_BASE  || 'http://172.17.0.8:3004';
const AI_BASE     = process.env.SF1_AI_BASE     || 'http://172.17.0.22:3013';
const NOTIF_BASE  = process.env.SF1_NOTIF_BASE  || 'http://172.17.0.21:3014';

export const authClient      = axios.create({ baseURL: AUTH_BASE,   timeout: 10000 });
export const communityClient = axios.create({ baseURL: COMM_BASE,   timeout: 10000 });
export const journalClient   = axios.create({ baseURL: JOURN_BASE,  timeout: 10000 });
export const mediaClient     = axios.create({ baseURL: MEDIA_BASE,  timeout: 10000 });
export const priceClient     = axios.create({ baseURL: PRICE_BASE,  timeout: 10000 });
export const gamClient       = axios.create({ baseURL: GAM_BASE,    timeout: 10000 });
export const searchClient    = axios.create({ baseURL: SEARCH_BASE, timeout: 10000 });
export const backupClient    = axios.create({ baseURL: BACKUP_BASE, timeout: 10000 });
export const toolsClient     = axios.create({ baseURL: TOOLS_BASE,  timeout: 10000 });
export const aiClient        = axios.create({ baseURL: AI_BASE,     timeout: 10000 });
export const notifClient     = axios.create({ baseURL: NOTIF_BASE,  timeout: 10000 });

// Hilfsfunktion: Auth-Header setzen
export function withAuth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// Hilfsfunktion: sicherer HTTP-Call, gibt null bei Netzwerkfehler
export async function safeGet(client: ReturnType<typeof axios.create>, path: string, config?: object) {
  try {
    return await client.get(path, config);
  } catch (err: any) {
    if (err.response) return err.response;
    return null;
  }
}

export async function safePost(client: ReturnType<typeof axios.create>, path: string, data?: object, config?: object) {
  try {
    return await client.post(path, data, config);
  } catch (err: any) {
    if (err.response) return err.response;
    return null;
  }
}

export async function safeDelete(client: ReturnType<typeof axios.create>, path: string, config?: object) {
  try {
    return await client.delete(path, config);
  } catch (err: any) {
    if (err.response) return err.response;
    return null;
  }
}
