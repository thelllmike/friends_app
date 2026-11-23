// Shows "No connection" (design 15) over the whole app when the device is offline.
import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { StateScreen } from './StateScreen';
import { API_URL } from '@/lib/api';

// Check reachability against our own server instead of NetInfo's default (a Google URL): no third-party
// pings, and the check reflects whether Friends itself is usable. Generous timeouts so a slow mobile
// connection isn't mistaken for "offline" mid-call.
NetInfo.configure({
  reachabilityUrl: `${API_URL}/health`,
  reachabilityMethod: 'GET', // NetInfo defaults to HEAD; /health is a plain GET endpoint
  reachabilityTest: async (r) => r.status === 200,
  reachabilityRequestTimeout: 20_000,
  reachabilityLongTimeout: 60_000,
  reachabilityShortTimeout: 5_000,
  useNativeReachability: false,
});

export function OfflineGate({ children }: { children: React.ReactNode }) {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => NetInfo.addEventListener((s) => {
    // isInternetReachable is null while unknown: only treat explicit false as offline.
    setOffline(s.isConnected === false || s.isInternetReachable === false);
  }), []);

  const retry = async () => {
    setChecking(true);
    try {
      const r = await fetch(`${API_URL}/health`);
      if (r.ok) setOffline(false);
    } catch { /* still offline */ }
    const s = await NetInfo.refresh();
    if (s.isConnected && s.isInternetReachable !== false) setOffline(false);
    setChecking(false);
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {offline ? (
        <View style={StyleSheet.absoluteFill}>
          <StateScreen tone="warm" Icon={WifiOff} title="No connection"
            text="Check your Wi-Fi or mobile data, then try again."
            primary={{ title: 'Try again', onPress: retry, loading: checking }}
            secondary={Platform.OS === 'web' ? undefined : {
              title: 'Open network settings',
              onPress: () => (Platform.OS === 'android' ? Linking.sendIntent('android.settings.WIRELESS_SETTINGS').catch(() => Linking.openSettings()) : Linking.openSettings()),
            }} />
        </View>
      ) : null}
    </View>
  );
}
