// Session state: tokens + current user. Screens read it with useAuth().
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, AuthOut, Me, tokens } from './api';
import { prefs } from './storage';

type Status = 'loading' | 'signedOut' | 'signedIn';
type Ctx = {
  status: Status;
  me: Me | null;
  setSession: (a: AuthOut) => Promise<void>;
  refreshMe: () => Promise<Me | null>;
  setMe: (m: Me) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);

  const reset = useCallback(async () => {
    await tokens.clear();
    await prefs.del('recent_people');
    setMe(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    tokens.onSignedOut(() => { setMe(null); setStatus('signedOut'); });
    (async () => {
      const t = await tokens.load();
      const rt = await tokens.refreshToken();
      if (!t && !rt) { setStatus('signedOut'); return; }
      try {
        setMe(await api<Me>('/me'));
        setStatus('signedIn');
      } catch (e: any) {
        // Offline at launch: keep the session; screens will retry.
        if (e?.status === 0) { setStatus('signedIn'); return; }
        await reset();
      }
    })();
  }, [reset]);

  const setSession = useCallback(async (a: AuthOut) => {
    await tokens.save(a.access_token, a.refresh_token);
    setMe(a.user);
    setStatus('signedIn');
  }, []);

  const refreshMe = useCallback(async () => {
    try { const m = await api<Me>('/me'); setMe(m); return m; } catch { return null; }
  }, []);

  const signOut = useCallback(async () => {
    const rt = await tokens.refreshToken();
    try { if (rt) await api('/auth/logout', { method: 'POST', body: { refresh_token: rt } }); } catch { /* still sign out locally */ }
    await reset();
  }, [reset]);

  const deleteAccount = useCallback(async () => {
    await api('/me', { method: 'DELETE' });
    await reset();
  }, [reset]);

  const value = useMemo(() => ({ status, me, setSession, refreshMe, setMe, signOut, deleteAccount }),
    [status, me, setSession, refreshMe, signOut, deleteAccount]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

/** Where a signed-in user should land. */
export function homeFor(me: Me | null): '/profile-setup' | '/home' {
  return me && (!me.profile_complete || !me.onboarding_completed) ? '/profile-setup' : '/home';
}
