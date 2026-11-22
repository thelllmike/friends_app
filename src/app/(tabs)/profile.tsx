// Settings (design 13).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ban, Crown, Globe, Link2, Lock, LogOut, ShieldCheck, Trash2, User } from 'lucide-react-native';
import { Avatar, Screen, T } from '@/components/ui';
import { confirm, Group, Row } from '@/components/Rows';
import { toast } from '@/components/Toast';
import { useAuth } from '@/lib/auth';
import { useMatch } from '@/lib/match';
import { googleSignOut } from '@/lib/signin';
import { languageName } from '@/lib/languages';
import { colors, font, shadow } from '@/lib/theme';

export default function Settings() {
  const router = useRouter();
  const { me, signOut, deleteAccount } = useAuth();
  const { countryName } = useMatch();
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const logout = async () => {
    if (!(await confirm('Log out?', 'You can sign back in any time.', 'Log out'))) return;
    await googleSignOut();
    await signOut();
    router.replace('/login');
  };

  const del = async () => {
    if (!(await confirm('Delete your account?', 'This permanently deletes your profile, photo and history. It can’t be undone.', 'Delete', true))) return;
    setBusy(true);
    try { await deleteAccount(); await googleSignOut(); router.replace('/login'); toast('Your account was deleted'); }
    catch (e: any) { toast(e.message, 'error'); setBusy(false); }
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <T v="h1" style={{ marginTop: 12 }} accessibilityRole="header">Settings</T>

        <View style={styles.profile}>
          <Avatar name={me.display_name} uri={me.photo_url} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{me.display_name || 'You'}{me.age ? `, ${me.age}` : ''}</Text>
            <Text style={styles.sub} numberOfLines={1}>{countryName(me.country)}{me.is_premium ? ' · Premium' : ''}</Text>
          </View>
          <Pressable onPress={() => router.push('/edit-profile')} style={styles.edit} accessibilityRole="button" accessibilityLabel="Edit profile">
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        {!me.is_premium ? (
          <Pressable onPress={() => router.push('/premium')} style={styles.promo} accessibilityRole="button">
            <Crown size={18} color="#B7791F" /><Text style={styles.promoText}>Go Premium to choose who you meet</Text>
          </Pressable>
        ) : null}

        <Group title="Account">
          <Row Icon={User} label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <Row Icon={Link2} label="Linked accounts" onPress={() => router.push('/linked-accounts')} />
          {me.is_premium ? <Row Icon={Crown} label="Premium" value="Active" onPress={() => router.push('/premium')} /> : null}
        </Group>
        <Group title="Privacy and safety">
          <Row Icon={Lock} label="Privacy" onPress={() => router.push('/privacy')} />
          <Row Icon={Ban} label="Blocked users" onPress={() => router.push('/blocked')} />
          <Row Icon={ShieldCheck} label="Safety tips" onPress={() => router.push('/safety-tips')} />
        </Group>
        <Group title="Preferences">
          <Row Icon={Globe} label="Language" value={languageName(me.language)} onPress={() => router.push('/language')} />
        </Group>
        <Group>
          <Row testID="delete-account" Icon={Trash2} label={busy ? 'Deleting…' : 'Delete account'} danger onPress={busy ? undefined : del} />
          <Row testID="logout" Icon={LogOut} label="Log out" onPress={logout} />
        </Group>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 18, ...shadow.card, shadowOpacity: 0.06 },
  name: { fontFamily: font.displaySemi, fontSize: 17, color: colors.text },
  sub: { fontFamily: font.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  edit: { backgroundColor: colors.surface2, borderRadius: 16, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  editText: { fontFamily: font.semi, fontSize: 14, color: colors.text },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF6E5', borderRadius: 16, paddingHorizontal: 14, height: 48, marginTop: 12, borderWidth: 1, borderColor: '#FFE2B0' },
  promoText: { fontFamily: font.medium, fontSize: 14, color: '#7A4A00' },
});
