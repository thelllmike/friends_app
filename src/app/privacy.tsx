import React from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FileText, LogOut, Shield } from 'lucide-react-native';
import { Screen, T } from '@/components/ui';
import { confirm, Group, Row, SubHeader } from '@/components/Rows';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PRIVACY_URL, TERMS_URL } from '@/lib/consent';
import { colors } from '@/lib/theme';

export default function Privacy() {
  const router = useRouter();
  const { signOut } = useAuth();
  const logoutAll = async () => {
    if (!(await confirm('Log out everywhere?', 'You’ll be signed out on every phone and browser, including this one.', 'Log out everywhere'))) return;
    try { await api('/auth/logout-all', { method: 'POST' }); } catch (e: any) { toast(e.message, 'error'); return; }
    await signOut();
    router.replace('/login');
  };
  return (
    <Screen>
      <SubHeader title="Privacy" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 8, gap: 10 }}>
          <T v="bodyStrong">How your data is used</T>
          <T style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
            Video and audio go directly between you and the other person and are never recorded. Chat messages are not stored.
            People you meet only see your display name, age, country and photo. Your camera and mic are only used during a call.
          </T>
        </View>
        <Group title="Documents">
          <Row Icon={Shield} label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row Icon={FileText} label="Terms of Service" onPress={() => Linking.openURL(TERMS_URL)} />
        </Group>
        <Group title="Sessions">
          <Row Icon={LogOut} label="Log out on all devices" onPress={logoutAll} />
        </Group>
      </ScrollView>
    </Screen>
  );
}
