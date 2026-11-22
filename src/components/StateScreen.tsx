// Full-screen empty/error state (design 14, 15, 16): glowing icon, title, text, two buttons.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Screen, T } from './ui';
import { colors } from '@/lib/theme';

type Tone = 'red' | 'warm' | 'blue';
const TONES: Record<Tone, { ring: string; fill: string; icon: string }> = {
  red: { ring: 'rgba(229,56,79,0.18)', fill: '#FFD3DA', icon: colors.danger },
  warm: { ring: 'rgba(255,184,77,0.25)', fill: '#FFE2B5', icon: '#F0A030' },
  blue: { ring: 'rgba(24,119,242,0.18)', fill: '#CFE2FF', icon: colors.blue },
};

export function StateScreen({ tone, Icon, title, text, primary, secondary, children }: {
  tone: Tone; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string; text: string; children?: React.ReactNode;
  primary: { title: string; onPress: () => void; loading?: boolean };
  secondary?: { title: string; onPress: () => void };
}) {
  const t = TONES[tone];
  return (
    <Screen glow={tone}>
      <View style={styles.body}>
        <View style={[styles.ring, { backgroundColor: t.ring }]}>
          <View style={[styles.inner, { backgroundColor: t.fill }]}><Icon size={44} color={t.icon} strokeWidth={2} /></View>
        </View>
        <T v="h2" style={styles.title} accessibilityRole="header">{title}</T>
        <T style={styles.text}>{text}</T>
        {children}
      </View>
      <View style={styles.actions}>
        <Button title={primary.title} onPress={primary.onPress} loading={primary.loading} />
        {secondary ? <Button title={secondary.title} kind="secondary" onPress={secondary.onPress} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  ring: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  inner: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', fontSize: 24, marginBottom: 12 },
  text: { textAlign: 'center', color: colors.muted, fontSize: 15, lineHeight: 22, maxWidth: 300 },
  actions: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
});
