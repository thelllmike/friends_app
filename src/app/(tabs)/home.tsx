// Home (design 07): online count, big Start button, "Match with" filters.
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Globe, Video } from 'lucide-react-native';
import { Chip, LogoMark, Screen, T } from '@/components/ui';
import { CountryPicker } from '@/components/CountryPicker';
import { Sheet } from '@/components/Sheet';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMatch } from '@/lib/match';
import { colors, font, gradient, shadow } from '@/lib/theme';

const GENDER_OPTS = [{ id: 'Anywhere', label: 'Everyone' }, { id: 'female', label: 'Women' }, { id: 'male', label: 'Men' }, { id: 'other', label: 'Other' }];

export default function HomeScreen() {
  const router = useRouter();
  const { me, refreshMe } = useAuth();
  const { filters, setFilters, countryName } = useMatch();
  const [online, setOnline] = useState<number | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const premium = !!me?.is_premium;

  useFocusEffect(useCallback(() => {
    let alive = true;
    const load = () => api<{ online: number }>('/online-count', { auth: false }).then((r) => alive && setOnline(r.online)).catch(() => {});
    load();
    refreshMe();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [refreshMe]));

  const anywhere = filters.country === 'Anywhere' && filters.gender === 'Anywhere';
  const genderLabel = GENDER_OPTS.find((g) => g.id === filters.gender)?.label;

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <LogoMark size={40} />
          <T v="title" style={{ fontFamily: font.display, fontSize: 20 }}>Friends</T>
        </View>
        <Pressable onPress={() => router.push('/premium')} accessibilityRole="button" accessibilityLabel="Premium">
          <LinearGradient colors={gradient.premium} style={styles.crown}><Crown size={20} color="#7A4A00" /></LinearGradient>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.onlinePill} accessibilityLiveRegion="polite">
          <View style={styles.dot} />
          <Text style={styles.onlineText}>{online === null ? 'Checking who\'s online…' : `${online.toLocaleString()} ${online === 1 ? 'person' : 'people'} online`}</Text>
        </View>

        <View style={styles.center}>
          <View style={styles.ring2}><View style={styles.ring1}>
            <Pressable testID="start-chat" onPress={() => router.push('/call')} accessibilityRole="button" accessibilityLabel="Start video chat">
              {({ pressed }) => (
                <LinearGradient colors={pressed ? ['#0B5ED7', '#0A4FB5'] : gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.start, shadow.glow]}>
                  <Video size={46} color="#fff" strokeWidth={1.8} />
                  <Text style={styles.startText}>Start{'\n'}Video Chat</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View></View>
          <T style={{ color: colors.muted, marginTop: 20, fontSize: 15 }}>Tap to meet someone new</T>
        </View>

        <View style={styles.filters}>
          <T v="caption" style={{ marginBottom: 10 }}>Match with</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 24 }}>
            <Chip label="Anywhere" selected={anywhere} icon={<Globe size={15} color={anywhere ? colors.blue : colors.text} />}
              onPress={() => setFilters({ country: 'Anywhere', gender: 'Anywhere' })} />
            <Chip label={filters.country !== 'Anywhere' ? countryName(filters.country) : 'Country'} locked={!premium}
              selected={filters.country !== 'Anywhere'} onPress={() => (premium ? setCountryOpen(true) : router.push('/premium'))} />
            <Chip label={filters.gender !== 'Anywhere' ? genderLabel || 'Gender' : 'Gender'} locked={!premium}
              selected={filters.gender !== 'Anywhere'} onPress={() => (premium ? setGenderOpen(true) : router.push('/premium'))} />
          </ScrollView>
        </View>
      </ScrollView>

      <CountryPicker visible={countryOpen} allowAnywhere value={filters.country} onClose={() => setCountryOpen(false)}
        onPick={(c) => { setFilters({ ...filters, country: c }); setCountryOpen(false); }} />
      <Sheet visible={genderOpen} onClose={() => setGenderOpen(false)}>
        <T v="h2" style={{ marginBottom: 14 }}>Who do you want to meet?</T>
        <View style={{ gap: 10, marginBottom: 8 }}>
          {GENDER_OPTS.map((g) => (
            <Chip key={g.id} label={g.label} selected={filters.gender === g.id} style={{ height: 52, borderRadius: 18 }}
              onPress={() => { setFilters({ ...filters, gender: g.id }); setGenderOpen(false); }} />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  crown: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  onlinePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, height: 36, borderWidth: 1, borderColor: colors.border, marginTop: 16, ...shadow.card, shadowOpacity: 0.05 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.success },
  onlineText: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, minHeight: 360 },
  ring2: { width: 310, height: 310, borderRadius: 155, borderWidth: 1, borderColor: 'rgba(24,119,242,0.12)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(24,119,242,0.03)' },
  ring1: { width: 270, height: 270, borderRadius: 135, borderWidth: 1, borderColor: 'rgba(24,119,242,0.16)', alignItems: 'center', justifyContent: 'center' },
  start: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center', gap: 10 },
  startText: { color: '#fff', fontFamily: font.display, fontSize: 22, lineHeight: 26, textAlign: 'center' },
  filters: { paddingLeft: 24, paddingBottom: 16 },
});
