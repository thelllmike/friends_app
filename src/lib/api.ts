// REST client for the Friends backend: bearer auth, automatic refresh-token rotation, typed errors.
import { Platform } from 'react-native';
import { secure } from './storage';

function defaultApiUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000'; // Android emulator -> host machine
  if (Platform.OS === 'web' && typeof location !== 'undefined' && location.port !== '8081') return location.origin;
  return 'http://127.0.0.1:8000';
}

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || defaultApiUrl()).replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

export type Me = {
  id: string; display_name: string | null; age: number | null; country: string | null; gender: string | null;
  interests: string[]; photo_url: string | null; language: string; email: string | null; phone: string | null;
  onboarding_step: number; onboarding_total_steps: number; onboarding_completed: boolean; profile_complete: boolean;
  is_premium: boolean; premium_until: string | null; created_at: string;
};
export type AuthOut = { access_token: string; refresh_token: string; expires_in: number; is_new_user: boolean; user: Me };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

const ACCESS = 'friends.access';
const REFRESH = 'friends.refresh';
let access: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSignedOut: () => void = () => {};

export const tokens = {
  async load() { access = await secure.get(ACCESS); return access; },
  async save(a: string, r: string) { access = a; await secure.set(ACCESS, a); await secure.set(REFRESH, r); },
  async clear() { access = null; await secure.del(ACCESS); await secure.del(REFRESH); },
  get access() { return access; },
  refreshToken: () => secure.get(REFRESH),
  onSignedOut(fn: () => void) { onSignedOut = fn; },
};

async function doRefresh(): Promise<boolean> {
  const rt = await secure.get(REFRESH);
  if (!rt) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }),
    });
    if (!res.ok) {
      // 401 = token revoked/reused/expired -> sign out. Other errors (5xx) keep the session.
      if (res.status === 401) { await tokens.clear(); onSignedOut(); }
      return false;
    }
    const d = await res.json();
    await tokens.save(d.access_token, d.refresh_token);
    return true;
  } catch { return false; }
}

/** Refresh once even if many requests hit 401 at the same time. */
export function refreshAccess(): Promise<boolean> {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

type Opts = { method?: string; body?: unknown; form?: FormData; auth?: boolean; retry?: boolean };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, form, auth = true, retry = true } = opts;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && access) headers.Authorization = `Bearer ${access}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError(0, 'network', "Can't reach Friends. Check your connection.");
  }
  if (res.status === 401 && auth && retry && (await refreshAccess())) return api<T>(path, { ...opts, retry: false });
  if (res.status === 204) return undefined as T;
  let data: any = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const e = data?.error ?? {};
    let msg: string = e.message || `Something went wrong (${res.status})`;
    if (e.code === 'validation_error' && Array.isArray(e.details) && e.details[0]?.msg) {
      msg = String(e.details[0].msg).replace(/^Value error, /, '');
    }
    if (res.status === 401 && auth) { await tokens.clear(); onSignedOut(); }
    throw new ApiError(res.status, e.code || 'error', msg, e.details);
  }
  return data as T;
}
