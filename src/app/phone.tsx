// Phone sign-in: enter number -> receive 6-digit code -> verify.
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInputInstance, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Button, IconButton, Input, Screen, T } from '@/components/ui';
import { api, AuthOut } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import { authErrorMessage, consent } from '@/lib/consent';
import { colors, font } from '@/lib/theme';

export default function Phone() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [phone, setPhone] = useState('+');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async () => {
    const p = phone.replace(/[^\d+]/g, '');
    if (!/^\+\d{7,15}$/.test(p)) { setError('Enter your number with country code, like +94 77 123 4567'); return; }
    setBusy(true); setError(null);
    try {
      const r = await api<{ sent: boolean; expires_in: number; dev_code?: string | null }>('/auth/otp/request', { method: 'POST', auth: false, body: { phone: p } });
      setDevCode(r.dev_code ?? null);
      setStep('code'); setCode(''); setResendIn(30);
      setTimeout(() => codeRef.current?.focus(), 250);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const verify = async (c = code) => {
    if (c.length !== 6) { setError('Enter the 6-digit code'); return; }
    setBusy(true); setError(null);
    try {
      const a = await api<AuthOut>('/auth/otp/verify', { method: 'POST', auth: false, body: { phone: phone.replace(/[^\d+]/g, ''), code: c, ...consent } });
      await setSession(a);
      router.dismissAll();
      router.replace(homeFor(a.user));
    } catch (e: any) { setError(authErrorMessage(e)); setBusy(false); }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <IconButton label="Back" onPress={() => (step === 'code' ? setStep('phone') : router.back())}><ChevronLeft size={22} color={colors.text} /></IconButton>
        </View>
        <View style={styles.body}>
          {step === 'phone' ? (
            <>
              <T v="h1" accessibilityRole="header">Your phone number</T>
              <T style={styles.sub}>We’ll text you a 6-digit code to sign in.</T>
              <Input testID="phone-input" value={phone} onChangeText={(v) => { setPhone(v.startsWith('+') ? v : '+' + v.replace(/\+/g, '')); setError(null); }}
                keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="+94 77 123 4567"
                error={error} autoFocus returnKeyType="done" onSubmitEditing={send} accessibilityLabel="Phone number" />
            </>
          ) : (
            <>
              <T v="h1" accessibilityRole="header">Enter the code</T>
              <T style={styles.sub}>Sent to {phone}. <Text style={styles.link} onPress={() => setStep('phone')}>Change</Text></T>
              <Input testID="code-input" ref={codeRef} value={code} maxLength={6} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode"
                onChangeText={(v) => { const c = v.replace(/\D/g, ''); setCode(c); setError(null); if (c.length === 6) verify(c); }}
                placeholder="••••••" error={error} style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }} accessibilityLabel="Verification code" />
              {devCode && __DEV__ ? (
                <Pressable onPress={() => { setCode(devCode); verify(devCode); }} style={styles.dev}>
                  <T v="caption">Dev mode code: <Text style={{ fontFamily: font.semi, color: colors.blue }}>{devCode}</Text> (tap to use)</T>
                </Pressable>
              ) : null}
              <Pressable disabled={resendIn > 0 || busy} onPress={send} style={{ marginTop: 18 }} accessibilityRole="button">
                <T v="caption" style={{ color: resendIn > 0 ? colors.muted : colors.blue }}>{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</T>
              </Pressable>
            </>
          )}
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
          <Button testID="phone-submit" title={step === 'phone' ? 'Send code' : 'Verify'} loading={busy} onPress={() => (step === 'phone' ? send() : verify())} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 24, paddingTop: 8, height: 56, justifyContent: 'center' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  sub: { color: colors.muted, marginTop: 8, marginBottom: 24, fontSize: 15 },
  link: { color: colors.blue, fontFamily: font.medium },
  dev: { marginTop: 14, backgroundColor: colors.blueSoft, borderRadius: 12, padding: 12 },
});
