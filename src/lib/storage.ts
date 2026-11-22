// Secrets (tokens) go to the Keychain/Keystore via SecureStore; on web we fall back to localStorage.
// Non-secret app data (recent people, filters) uses AsyncStorage.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const web = Platform.OS === 'web';

export const secure = {
  async get(key: string): Promise<string | null> {
    if (web) { try { return localStorage.getItem(key); } catch { return null; } }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (web) { try { localStorage.setItem(key, value); } catch { /* private mode */ } return; }
    await SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (web) { try { localStorage.removeItem(key); } catch { /* ignore */ } return; }
    await SecureStore.deleteItemAsync(key);
  },
};

export const prefs = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const v = await AsyncStorage.getItem(key);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch { return fallback; }
  },
  async set(key: string, value: unknown): Promise<void> {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  async del(key: string): Promise<void> {
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
  },
};
