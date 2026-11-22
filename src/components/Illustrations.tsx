// Shape-based illustrations used on onboarding and call placeholders (no image assets needed).
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font } from '@/lib/theme';

/** Blue "video tile" with a head-and-shoulders silhouette. */
export function PersonCard({ width, height, tag, style, faded, dark }: {
  width: number; height: number; tag?: string; style?: StyleProp<ViewStyle>; faded?: boolean; dark?: boolean;
}) {
  const head = width * 0.3;
  return (
    <View style={[{ width, height, borderRadius: 24, overflow: 'hidden', opacity: faded ? 0.55 : 1 },
      !dark && { shadowColor: '#1B4FA8', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 8 }, style]}>
      <LinearGradient colors={dark ? ['#2A4A8E', '#16306A'] : ['#D8E6FF', '#7FAEF5']} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: height * 0.18, alignSelf: 'center', width: head, height: head, borderRadius: head / 2, backgroundColor: 'rgba(255,255,255,0.45)' }} />
      <View style={{ position: 'absolute', bottom: -height * 0.18, alignSelf: 'center', width: width * 0.82, height: height * 0.55, borderRadius: width, backgroundColor: 'rgba(255,255,255,0.45)' }} />
      {tag ? (
        <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
      ) : null}
    </View>
  );
}

/** Big faint silhouette behind the remote video while it connects. */
export function RemotePlaceholder() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: '24%', alignSelf: 'center', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      <View style={{ position: 'absolute', bottom: '-12%', alignSelf: 'center', width: '92%', height: '42%', borderTopLeftRadius: 400, borderTopRightRadius: 400, backgroundColor: 'rgba(255,255,255,0.08)' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: 'absolute', bottom: 14, left: 14, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontFamily: font.semi, fontSize: 12, color: colors.text },
});
