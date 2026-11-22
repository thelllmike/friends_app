// Login / Sign up (design 05): Google, Apple, phone; 18+ and Terms consent required.
import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Smartphone } from 'lucide-react-native';
import { Button, Checkbox, LogoMark, Screen, T } from '@/components/ui';
import { toast } from '@/components/Toast';
import { api, AuthOut } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import { authErrorMessage, consent, PRIVACY_URL, TERMS_URL } from '@/lib/consent';
import { appleAvailable, appleCredential, Cancelled, googleAvailable, googleIdToken } from '@/lib/signin';
import { colors, font } from '@/lib/theme';

export default function Login() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [adult, setAdult] = useState(consent.confirm_18_plus);
  const [terms, setTerms] = useState(consent.accept_terms);
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [hasApple, setHasApple] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { appleAvailable().then(setHasApple); }, []);
  useEffect(() => { consent.confirm_18_plus = adult; consent.accept_terms = terms; }, [adult, terms]);

  const ready = adult && terms;
  const needConsent = () => {
    if (ready) return false;
    setError('Please confirm you are 18 or older and accept the Terms to continue.');
    return true;
  };

  const finish = async (a: AuthOut) => {
    await setSession(a);
    router.replace(homeFor(a.user));
  };

  const google = async () => {
    if (needConsent()) return;
    setBusy('google'); setError(null);
    try {
      const id_token = await googleIdToken();
      await finish(await api<AuthOut>('/auth/google', { method: 'POST', auth: false, body: { id_token, ...consent } }));
    } catch (e) {
      if (!(e instanceof Cancelled)) setError(authErrorMessage(e));
    } finally { setBusy(null); }
  };

  const apple = async () => {
    if (needConsent()) return;
    setBusy('apple'); setError(null);
    try {
      const c = await appleCredential();
      await finish(await api<AuthOut>('/auth/apple', {
        method: 'POST', auth: false, body: { identity_token: c.identityToken, display_name: c.displayName, ...consent },
      }));
    } catch (e) {
      if (!(e instanceof Cancelled)) setError(authErrorMessage(e));
    } finally { setBusy(null); }
  };

  const phone = () => { if (!needConsent()) router.push('/phone'); };

  return (
    <Screen>
      <View style={styles.head}>
        <LogoMark size={72} />
        <T v="h1" style={{ marginTop: 26, textAlign: 'center' }} accessibilityRole="header">Welcome to Friends</T>
        <T style={{ color: colors.muted, marginTop: 10, textAlign: 'center', fontSize: 15 }}>Sign up or log in to start meeting people.</T>
      </View>

      <View style={styles.buttons}>
        {googleAvailable ? (
          <Button kind="outline" title="Continue with Google" onPress={google} loading={busy === 'google'}
            icon={<Text style={styles.g}>G</Text>} />
        ) : null}
        {hasApple ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={22} style={{ width: '100%', height: 56, opacity: busy === 'apple' ? 0.6 : 1 }}
            onPress={apple} />
        ) : null}
        <Button kind="secondary" title="Continue with phone number" onPress={phone} testID="login-phone"
          icon={<Smartphone size={20} color={colors.text} />} />
      </View>

      <View style={styles.consent}>
        <Checkbox checked={adult} onChange={(v) => { setAdult(v); setError(null); }} testID="consent-18">
          <T style={styles.consentText}>I confirm that I am 18 years or older</T>
        </Checkbox>
        <Checkbox checked={terms} onChange={(v) => { setTerms(v); setError(null); }} testID="consent-terms">
          <T style={styles.consentText}>
            I agree to the <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text> and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
          </T>
        </Checkbox>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {!googleAvailable && Platform.OS !== 'web' && __DEV__ ? (
          <Text style={styles.dev} onPress={() => toast('Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google sign-in')}>Google sign-in is off until its client ID is set.</Text>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />
      <T v="caption" style={styles.foot}>Your camera and mic are only used during a call.</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  buttons: { paddingHorizontal: 24, gap: 12, marginTop: 36 },
  g: { fontFamily: font.display, fontSize: 18, color: colors.blue },
  consent: { paddingHorizontal: 24, marginTop: 28, gap: 12 },
  consentText: { fontSize: 14, lineHeight: 21 },
  link: { color: colors.blue, textDecorationLine: 'underline', fontFamily: font.medium },
  error: { color: colors.danger, fontFamily: font.medium, fontSize: 13 },
  dev: { color: colors.muted, fontFamily: font.body, fontSize: 12 },
  foot: { textAlign: 'center', paddingBottom: 12, paddingHorizontal: 24 },
});
