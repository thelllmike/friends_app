// Splash (design 01): brand, then route to onboarding / login / profile setup / home.
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogoMark, Screen, T } from '@/components/ui';
import { homeFor, useAuth } from '@/lib/auth';
import { prefs } from '@/lib/storage';
import { colors } from '@/lib/theme';

export default function Splash() {
  const { status, me } = useAuth();
  const router = useRouter();
  const [minTime, setMinTime] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMinTime(true), 900); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (status === 'loading' || !minTime) return;
    (async () => {
      if (status === 'signedIn') { router.replace(homeFor(me)); return; }
      const seen = await prefs.get('seen_onboarding', false);
      router.replace(seen ? '/login' : '/onboarding');
    })();
  }, [status, me, minTime, router]);

  return (
    <Screen>
      <View style={styles.center}>
        <LogoMark size={96} />
        <T v="h1" style={{ marginTop: 28, fontSize: 32 }}>Friends</T>
        <T style={{ color: colors.muted, marginTop: 8, fontSize: 15 }}>Meet someone new, face to face.</T>
      </View>
      <View style={styles.foot}>
        <View style={styles.dots}>{[0.35, 1, 0.35].map((o, i) => <View key={i} style={[styles.dot, { opacity: o }]} />)}</View>
        <T v="caption" style={{ marginTop: 28 }}>18+ only. Be kind, stay safe.</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  foot: { alignItems: 'center', paddingBottom: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.blue },
});
