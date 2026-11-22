// Settings list rows, simple sub-page header, and a cross-platform confirm dialog.
import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { IconButton, T } from './ui';
import { colors, font, shadow } from '@/lib/theme';

export function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      {title ? <T v="caption" style={{ marginBottom: 8, marginLeft: 4 }}>{title}</T> : null}
      <View style={styles.group}>{React.Children.toArray(children).filter(Boolean).map((c, i) => (
        <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.border } : undefined}>{c}</View>
      ))}</View>
    </View>
  );
}

export function Row({ Icon, label, value, onPress, danger, right, testID }: {
  Icon?: React.ComponentType<{ size?: number; color?: string }>; label: string; value?: string | null; onPress?: () => void;
  danger?: boolean; right?: React.ReactNode; testID?: string;
}) {
  const tint = danger ? colors.danger : colors.blue;
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      {Icon ? <View style={[styles.icon, { backgroundColor: danger ? 'rgba(229,56,79,0.10)' : colors.blueSoft }]}><Icon size={17} color={tint} /></View> : null}
      <Text style={[styles.label, danger && { color: colors.danger }]} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {right ?? (onPress ? <ChevronRight size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function SubHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.sub}>
      <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}><ChevronLeft size={22} color={colors.text} /></IconButton>
      <T v="title" style={{ fontFamily: font.display, fontSize: 20 }} accessibilityRole="header">{title}</T>
    </View>
  );
}

/** Alert.alert with buttons doesn't work on web, so use window.confirm there. */
export function confirm(title: string, message: string, ok: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

const styles = StyleSheet.create({
  group: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card, shadowOpacity: 0.05 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, minHeight: 56 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.text },
  value: { fontFamily: font.body, fontSize: 14, color: colors.muted, maxWidth: '45%' },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
