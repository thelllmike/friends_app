// Tiny global toast: toast('Saved') from anywhere.
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/lib/theme';

type Msg = { id: number; text: string; kind: 'info' | 'error' };
let push: (m: Msg) => void = () => {};
let seq = 0;

export function toast(text: string, kind: 'info' | 'error' = 'info') {
  push({ id: ++seq, text, kind });
}

export function ToastHost() {
  const [msg, setMsg] = useState<Msg | null>(null);
  const [op] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  useEffect(() => {
    push = (m) => setMsg(m);
  }, []);
  useEffect(() => {
    if (!msg) return;
    Animated.timing(op, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const t = setTimeout(() => Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null)),
      msg.kind === 'error' ? 4000 : 2400);
    return () => clearTimeout(t);
  }, [msg, op]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + 12, opacity: op }, msg.kind === 'error' && { backgroundColor: colors.danger }]}>
      <Text style={styles.text}>{msg.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignSelf: 'center', maxWidth: '88%', backgroundColor: colors.text, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  text: { color: '#fff', fontFamily: font.medium, fontSize: 14, textAlign: 'center' },
});
