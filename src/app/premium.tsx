// Filters and Premium (design 12).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, Globe, Lock, Users, X, Zap } from 'lucide-react-native';
import { Button, IconButton, Screen, T } from '@/components/ui';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { TERMS_URL } from '@/lib/consent';
import { buy, closeStore, loadStorePlans, PurchaseCancelled, restore, storeAvailable, StorePlan } from '@/lib/purchases';
import { colors, font, gradient, shadow } from '@/lib/theme';

type Plan = { code: string; name: string; duration_days: number; price_cents: number; currency: string; google_product_id: string | null; apple_product_id: string | null; badge: string | null };
type Feature = { id: string; title: string; description: string };
const FEATURE_ICONS: Record<string, { Icon: any; tint: string; bg: string }> = {
  gender_filter: { Icon: Users, tint: colors.blue, bg: colors.blueSoft },
  country_filter: { Icon: Globe, tint: colors.blue, bg: colors.blueSoft },
  priority_matching: { Icon: Zap, tint: colors.success, bg: 'rgba(31,169,113,0.12)' },
};

function per(p: Plan) {
  if (p.duration_days <= 7) return { label: '1 week', per: 'per week' };
  if (p.duration_days <= 31) return { label: '1 month', per: 'per month' };
  return { label: '1 year', per: 'per year' };
}
const money = (cents: number, cur: string) => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(cents / 100); } catch { return `${(cents / 100).toFixed(2)} ${cur}`; }
};

export default function Premium() {
  const router = useRouter();
  const { me, refreshMe } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [store, setStore] = useState<Record<string, StorePlan>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ plans: Plan[]; features: Feature[] }>('/premium/plans', { auth: false });
        setPlans(r.plans); setFeatures(r.features);
        setSel((r.plans.find((p) => p.badge) || r.plans[1] || r.plans[0])?.code ?? null);
        const sp = await loadStorePlans(r.plans);
        setStore(Object.fromEntries(sp.map((x) => [x.code, x])));
      } catch (e: any) { setError(e.message); }
    })();
    return () => { closeStore(); };
  }, []);

  const purchase = async () => {
    if (!sel) return;
    setBusy('buy');
    try {
      await buy(store[sel]);
      await refreshMe();
      toast('Welcome to Premium!');
      router.back();
    } catch (e: any) {
      if (!(e instanceof PurchaseCancelled)) toast(e.message || 'Purchase failed', 'error');
    } finally { setBusy(null); }
  };

  const doRestore = async () => {
    setBusy('restore');
    try {
      const r = await restore();
      await refreshMe();
      toast(r.is_premium ? 'Premium restored' : 'No active Premium found for this store account');
      if (r.is_premium) router.back();
    } catch (e: any) { toast(e.message || 'Restore failed', 'error'); } finally { setBusy(null); }
  };

  const manage = () => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');

  return (
    <Screen glow="warm">
      <View style={styles.close}><IconButton label="Close" onPress={() => router.back()}><X size={20} color={colors.text} /></IconButton></View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <LinearGradient colors={gradient.premium} style={[styles.crown, shadow.card]}><Crown size={32} color="#7A4A00" /></LinearGradient>
          <T v="h1" style={{ marginTop: 18 }} accessibilityRole="header">{me?.is_premium ? 'You’re Premium' : 'Go Premium'}</T>
          <T style={{ color: colors.muted, marginTop: 6, fontSize: 15, textAlign: 'center' }}>
            {me?.is_premium && me.premium_until ? `Active until ${new Date(me.premium_until).toLocaleDateString()}` : 'Choose who you meet with filters.'}
          </T>
        </View>

        <View style={styles.features}>
          {(features.length ? features : [{ id: 'gender_filter', title: 'Gender filter', description: '' }, { id: 'country_filter', title: 'Country filter', description: '' }, { id: 'priority_matching', title: 'Priority matching', description: '' }]).map((f, i) => {
            const ic = FEATURE_ICONS[f.id] || FEATURE_ICONS.gender_filter;
            return (
              <View key={f.id} style={[styles.feature, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[styles.fIcon, { backgroundColor: ic.bg }]}><ic.Icon size={18} color={ic.tint} /></View>
                <T style={{ flex: 1, fontFamily: font.medium, fontSize: 15 }}>{f.title}</T>
                {me?.is_premium ? <Check size={18} color={colors.success} /> : <Lock size={16} color="#E0A040" />}
              </View>
            );
          })}
        </View>

        {!me?.is_premium ? (
          plans ? (
            <View style={styles.plans} accessibilityRole="radiogroup">
              {plans.map((p) => {
                const on = sel === p.code;
                const label = per(p);
                const price = store[p.code]?.displayPrice || money(p.price_cents, p.currency);
                return (
                  <Pressable key={p.code} onPress={() => setSel(p.code)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${p.name}, ${price} ${label.per}`} style={[styles.plan, on && styles.planOn]}>
                    {p.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{p.badge.toUpperCase()}</Text></View> : null}
                    <Text style={styles.planLabel}>{label.label}</Text>
                    <Text style={styles.planPrice} numberOfLines={1} adjustsFontSizeToFit>{price}</Text>
                    <Text style={styles.planPer}>{label.per}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : error ? <T style={{ color: colors.danger, textAlign: 'center', marginTop: 24 }}>{error}</T> : <ActivityIndicator style={{ marginTop: 32 }} color={colors.blue} />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {me?.is_premium ? (
          storeAvailable ? <Button title="Manage subscription" kind="secondary" onPress={manage} /> : <Button title="Done" onPress={() => router.back()} />
        ) : storeAvailable ? (
          <Button testID="premium-continue" title="Continue" onPress={purchase} loading={busy === 'buy'} disabled={!sel || !!busy} />
        ) : (
          <T v="caption" style={{ textAlign: 'center', marginBottom: 8 }}>Get Premium in the Friends app for Android or iPhone.</T>
        )}
        <Text style={styles.foot}>
          Cancel anytime.{' '}
          {storeAvailable ? <Text style={styles.link} onPress={busy ? undefined : doRestore}>{busy === 'restore' ? 'Restoring…' : 'Restore purchase'}</Text> : null}
          {storeAvailable ? ' · ' : ''}<Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms</Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  crown: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  features: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: colors.border, marginTop: 24, ...shadow.card, shadowOpacity: 0.06 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 58 },
  fIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  plans: { flexDirection: 'row', gap: 10, marginTop: 24 },
  plan: { flex: 1, backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', paddingVertical: 18, paddingHorizontal: 6, ...shadow.card, shadowOpacity: 0.05 },
  planOn: { borderWidth: 2, borderColor: colors.blue, shadowOpacity: 0.12 },
  badge: { position: 'absolute', top: -11, backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontFamily: font.semi, fontSize: 10, letterSpacing: 0.3 },
  planLabel: { fontFamily: font.medium, fontSize: 13, color: colors.text },
  planPrice: { fontFamily: font.display, fontSize: 20, color: colors.text, marginVertical: 4 },
  planPer: { fontFamily: font.body, fontSize: 12, color: colors.muted },
  foot: { textAlign: 'center', fontFamily: font.body, fontSize: 12, color: colors.muted, marginTop: 10 },
  link: { color: colors.blue, textDecorationLine: 'underline' },
});
