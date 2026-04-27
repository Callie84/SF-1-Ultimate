import axios from 'axios';

const BASE = 'http://localhost';

export const authClient   = axios.create({ baseURL: `${BASE}:3001`, timeout: 10000 });
export const communityClient = axios.create({ baseURL: `${BASE}:3005`, timeout: 10000 });
export const journalClient   = axios.create({ baseURL: `${BASE}:3006`, timeout: 10000 });
export const mediaClient     = axios.create({ baseURL: `${BASE}:3007`, timeout: 10000 });
export const priceClient     = axios.create({ baseURL: `${BASE}:3008`, timeout: 10000 });
export const gamClient       = axios.create({ baseURL: `${BASE}:3009`, timeout: 10000 });
export const searchClient    = axios.create({ baseURL: `${BASE}:3010`, timeout: 10000 });
export const backupClient    = axios.create({ baseURL: `${BASE}:3011`, timeout: 10000 });
export const toolsClient     = axios.create({ baseURL: `${BASE}:3012`, timeout: 10000 });
export const aiClient        = axios.create({ baseURL: `${BASE}:3013`, timeout: 10000 });
export const notifClient     = axios.create({ baseURL: `${BASE}:3014`, timeout: 10000 });

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
