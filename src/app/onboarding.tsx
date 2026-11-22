// Onboarding (designs 02–04): swipeable slides, Skip, dots, Continue / Get started.
import React, { useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, ScrollViewInstance, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Flag, Lock, ShieldCheck, SkipForward, User, Video } from 'lucide-react-native';
import { Button, Screen, T } from '@/components/ui';
import { PersonCard } from '@/components/Illustrations';
import { prefs } from '@/lib/storage';
import { colors, font, gradient, shadow } from '@/lib/theme';

const SLIDES = [
  { title: 'Meet new people,\ninstantly', text: 'Hop on a live video chat with someone from anywhere in the world. No profiles to browse, just say hi.' },
  { title: 'Not feeling it? Tap Next', text: 'One tap skips to a brand new person. Chat as long as you like, move on whenever you want.' },
  { title: 'Stay safe while you chat', text: 'Be kind and never share personal details. You are always in control.' },
];

function Art({ i }: { i: number }) {
  if (i === 0) {
    return (
      <View style={{ width: 300, height: 300 }}>
        <PersonCard width={150} height={200} tag="BR · Ana" style={{ position: 'absolute', left: 8, top: 10, transform: [{ rotate: '-8deg' }] }} />
        <PersonCard width={150} height={200} tag="JP · Kenji" style={{ position: 'absolute', right: 8, top: 66, transform: [{ rotate: '6deg' }] }} />
        <LinearGradient colors={gradient.accent} style={[styles.fab, { left: 122, top: 150 }]}><Video color="#fff" size={22} /></LinearGradient>
      </View>
    );
  }
  if (i === 1) {
    return (
      <View style={{ width: 320, height: 340, alignItems: 'center' }}>
        <PersonCard width={130} height={180} faded style={{ position: 'absolute', left: -20, top: 10, transform: [{ rotate: '-10deg' }] }} />
        <PersonCard width={160} height={210} tag="MX · Luis" style={{ position: 'absolute', right: 10, top: 0 }} />
        <LinearGradient colors={gradient.accent} style={[styles.fab, { width: 80, height: 80, borderRadius: 40, position: 'absolute', bottom: 0 }]}>
          <SkipForward color="#fff" size={30} />
        </LinearGradient>
      </View>
    );
  }
  const rows = [
    { Icon: Flag, text: 'Report or block anyone in one tap', tint: colors.blue, bg: colors.blueSoft },
    { Icon: User, text: '18+ only, age confirmed at sign up', tint: colors.blue, bg: colors.blueSoft },
    { Icon: Lock, text: 'You control your camera and mic', tint: colors.success, bg: 'rgba(31,169,113,0.12)' },
  ];
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <LinearGradient colors={gradient.accent} style={[{ width: 110, height: 110, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 26 }, shadow.glow]}>
        <ShieldCheck color="#fff" size={52} strokeWidth={1.8} />
      </LinearGradient>
      {rows.map(({ Icon, text, tint, bg }) => (
        <View key={text} style={styles.safeRow}>
          <View style={[styles.safeIcon, { backgroundColor: bg }]}><Icon size={18} color={tint} /></View>
          <T style={{ fontFamily: font.medium, fontSize: 14, flex: 1 }}>{text}</T>
        </View>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollViewInstance>(null);

  const finish = async () => { await prefs.set('seen_onboarding', true); router.replace('/login'); };
  const next = () => (page < SLIDES.length - 1 ? ref.current?.scrollTo({ x: width * (page + 1), animated: true }) : finish());
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <Screen>
      <View style={styles.top}>
        {page < SLIDES.length - 1 ? (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button"><T style={{ fontFamily: font.medium, color: colors.muted, fontSize: 15 }}>Skip</T></Pressable>
        ) : <View style={{ height: 22 }} />}
      </View>
      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={32}>
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width, paddingHorizontal: 24, alignItems: 'center' }}>
            <View style={styles.art}><Art i={i} /></View>
            <T v="h1" style={styles.title} accessibilityRole="header">{s.title}</T>
            <T style={styles.text}>{s.text}</T>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)}
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <Button title={page === SLIDES.length - 1 ? 'Get started' : 'Continue'} onPress={next} testID="onboarding-next" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 24 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 300 },
  title: { textAlign: 'center', fontSize: 26, lineHeight: 33 },
  text: { textAlign: 'center', color: colors.muted, marginTop: 12, fontSize: 15, lineHeight: 22, marginBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 20 },
  dot: { width: 8, height: 6, borderRadius: 3, backgroundColor: '#D5DAEE' },
  dotOn: { width: 28, backgroundColor: colors.blue },
  fab: { position: 'absolute', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...shadow.glow },
  safeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, width: '100%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
    borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, ...shadow.card, shadowOpacity: 0.05,
  },
  safeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
