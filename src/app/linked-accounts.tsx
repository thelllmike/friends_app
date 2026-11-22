// Linked accounts: see / link / unlink Google, Apple and phone sign-in methods.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Apple, Smartphone } from 'lucide-react-native';
import { Button, Input, Screen, T } from '@/components/ui';
import { confirm, Group, Row, SubHeader } from '@/components/Rows';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import { appleAvailable, appleCredential, Cancelled, googleAvailable, googleIdToken } from '@/lib/signin';
import { colors, font } from '@/lib/theme';

type Linked = { provider: 'google' | 'apple' | 'phone'; email: string | null; phone: string | null; linked_at: string };

const G = ({ size = 17 }: { size?: number; color?: string }) => <Text style={{ fontFamily: font.display, fontSize: size, color: colors.blue }}>G</Text>;

export default function LinkedAccounts() {
  const [list, setList] = useState<Linked[] | null>(null);
  const [hasApple, setHasApple] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState('+');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api<Linked[]>('/auth/linked-accounts').then(setList).catch((e) => toast(e.message, 'error')); }, []);
  useFocusEffect(load);
  useEffect(() => { appleAvailable().then(setHasApple); }, []);

  const get = (p: Linked['provider']) => list?.find((x) => x.provider === p);

  const unlink = async (p: Linked['provider']) => {
    if ((list?.length ?? 0) <= 1) { toast('Keep at least one way to sign in', 'error'); return; }
    if (!(await confirm('Unlink this sign-in method?', 'You won’t be able to sign in with it anymore.', 'Unlink', true))) return;
    try { await api(`/auth/link/${p}`, { method: 'DELETE' }); load(); } catch (e: any) { toast(e.message, 'error'); }
  };

  const linkGoogle = async () => {
    try { await api('/auth/link/google', { method: 'POST', body: { id_token: await googleIdToken() } }); toast('Google linked'); load(); }
    catch (e: any) { if (!(e instanceof Cancelled)) toast(e.message, 'error'); }
  };
  const linkApple = async () => {
    try { const c = await appleCredential(); await api('/auth/link/apple', { method: 'POST', body: { identity_token: c.identityToken } }); toast('Apple linked'); load(); }
    catch (e: any) { if (!(e instanceof Cancelled)) toast(e.message, 'error'); }
  };

  const sendCode = async () => {
    const p = phone.replace(/[^\d+]/g, '');
    setBusy(true);
    try {
      const r = await api<{ dev_code?: string }>('/auth/otp/request', { method: 'POST', auth: false, body: { phone: p } });
      setSent(p); if (r.dev_code && __DEV__) setCode(r.dev_code);
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try { await api('/auth/link/phone', { method: 'POST', body: { phone: sent, code } }); toast('Phone linked'); setPhoneOpen(false); setSent(null); setCode(''); load(); }
    catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const action = (p: Linked['provider'], link: () => void) => {
    const l = get(p);
    return (
      <Pressable onPress={l ? () => unlink(p) : link} style={styles.btn} accessibilityRole="button">
        <Text style={[styles.btnText, l && { color: colors.danger }]}>{l ? 'Unlink' : 'Link'}</Text>
      </Pressable>
    );
  };

  return (
    <Screen>
      <SubHeader title="Linked accounts" />
      {list === null ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <T style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Sign in to the same Friends account with any of these.</T>
          <Group>
            {googleAvailable || get('google') ? <Row Icon={G} label="Google" value={get('google')?.email || (get('google') ? 'Linked' : null)} right={action('google', linkGoogle)} /> : null}
            {hasApple || get('apple') ? <Row Icon={Apple} label="Apple" value={get('apple')?.email || (get('apple') ? 'Linked' : null)} right={action('apple', linkApple)} /> : null}
            <Row Icon={Smartphone} label="Phone" value={get('phone')?.phone} right={action('phone', () => setPhoneOpen(true))} />
          </Group>
        </ScrollView>
      )}
      <Sheet visible={phoneOpen} onClose={() => { setPhoneOpen(false); setSent(null); }}>
        <T v="h2" style={{ marginBottom: 14 }}>{sent ? 'Enter the code' : 'Link a phone number'}</T>
        {sent ? (
          <Input value={code} onChangeText={(v) => setCode(v.replace(/\D/g, ''))} maxLength={6} keyboardType="number-pad" placeholder="6-digit code" autoFocus />
        ) : (
          <Input value={phone} onChangeText={(v) => setPhone(v.startsWith('+') ? v : '+' + v)} keyboardType="phone-pad" placeholder="+94 77 123 4567" autoFocus />
        )}
        <View style={{ height: 16 }} />
        <Button title={sent ? 'Link phone' : 'Send code'} loading={busy} onPress={sent ? verify : sendCode} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: colors.surface2, borderRadius: 14, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  btnText: { fontFamily: font.semi, fontSize: 13, color: colors.blue },
});
