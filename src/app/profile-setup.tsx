// Profile setup (design 06): onboarding "2 of 3".
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { IconButton, Screen, T } from '@/components/ui';
import { ProfileForm } from '@/components/ProfileForm';
import { api, Me } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function ProfileSetup() {
  const router = useRouter();
  const { me, setMe, signOut } = useAuth();
  if (!me) return null;
  const step = Math.min(me.onboarding_step || 2, 3);
  const total = me.onboarding_total_steps || 3;

  const done = async (m: Me) => {
    try { m = await api<Me>('/me/onboarding', { method: 'PUT', body: { step: 3, completed: true } }); } catch { /* profile is saved; continue */ }
    setMe(m);
    router.replace('/home');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <IconButton label="Back to sign in" onPress={async () => { await signOut(); router.replace('/login'); }}>
          <ChevronLeft size={22} color={colors.text} />
        </IconButton>
        <View style={styles.track}><View style={[styles.fill, { width: `${(step / total) * 100}%` }]} /></View>
        <T v="caption">{step} of {total}</T>
      </View>
      <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 12 }}>
        <T v="h1" accessibilityRole="header">Set up your profile</T>
        <T style={{ color: colors.muted, marginTop: 6, fontSize: 15 }}>This is what people see when you connect.</T>
      </View>
      <ProfileForm me={me} submitLabel="Continue" onSaved={done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 8 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.blue },
});
