// Match filters (premium) + local "recent people" history + public data (countries, online count).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { prefs } from './storage';

export type Filters = { country: string; gender: string }; // 'Anywhere' or ISO code / 'male'|'female'|'other'
export type Partner = { id: string; display_name: string | null; age: number | null; country: string | null; photo_url: string | null };
export type RecentPerson = Partner & { room_id: string; met_at: string; duration_seconds: number | null; shared_interests: string[] };
export type Country = { code: string; name: string };

type Ctx = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  recent: RecentPerson[];
  addRecent: (p: RecentPerson) => void;
  updateRecent: (room_id: string, patch: Partial<RecentPerson>) => void;
  removeRecent: (userId: string) => void;
  countries: Country[];
  countryName: (code?: string | null) => string;
};

const MatchContext = createContext<Ctx | null>(null);
const ANY: Filters = { country: 'Anywhere', gender: 'Anywhere' };

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<Filters>(ANY);
  const [recent, setRecent] = useState<RecentPerson[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    prefs.get<Filters>('filters', ANY).then(setFiltersState);
    prefs.get<RecentPerson[]>('recent_people', []).then(setRecent);
    api<Country[]>('/meta/countries', { auth: false }).then(setCountries).catch(() => {});
  }, []);

  const setFilters = useCallback((f: Filters) => { setFiltersState(f); prefs.set('filters', f); }, []);

  const save = (list: RecentPerson[]) => { prefs.set('recent_people', list); return list; };
  const addRecent = useCallback((p: RecentPerson) => setRecent((r) => save([p, ...r.filter((x) => x.room_id !== p.room_id)].slice(0, 50))), []);
  const updateRecent = useCallback((room_id: string, patch: Partial<RecentPerson>) =>
    setRecent((r) => save(r.map((x) => (x.room_id === room_id ? { ...x, ...patch } : x)))), []);
  const removeRecent = useCallback((userId: string) => setRecent((r) => save(r.filter((x) => x.id !== userId))), []);

  const byCode = useMemo(() => new Map(countries.map((c) => [c.code, c.name])), [countries]);
  const countryName = useCallback((code?: string | null) => (code ? shortName(byCode.get(code) || code) : ''), [byCode]);

  const value = useMemo(() => ({ filters, setFilters, recent, addRecent, updateRecent, removeRecent, countries, countryName }),
    [filters, setFilters, recent, addRecent, updateRecent, removeRecent, countries, countryName]);
  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

/** pycountry names like "Korea, Republic of" -> "Korea" so they fit on chips. */
function shortName(n: string) {
  return n.replace(/,.*$/, '').replace(/ \(.*\)$/, '');
}

export function useMatch(): Ctx {
  const c = useContext(MatchContext);
  if (!c) throw new Error('useMatch outside MatchProvider');
  return c;
}

export const GENDERS = [{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }, { id: 'other', label: 'Other' }];
export const INTERESTS = ['Music', 'Travel', 'Gaming', 'Movies', 'Fitness', 'Art', 'Food', 'Anime', 'Tech', 'Books'];
