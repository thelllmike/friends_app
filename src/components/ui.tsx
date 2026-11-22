// Building blocks from the design system board: buttons, chips, inputs, toggles, checkbox, radio, logo.
import React from 'react';
import {
  ActivityIndicator, Image, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextInput, TextInputProps,
  TextInputInstance, TextStyle, View, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Check, Lock } from 'lucide-react-native';
import { colors, font, gradient, radius, shadow, type } from '@/lib/theme';

// ---- screen backgrounds ------------------------------------------------------------------------------
export function Screen({ children, edges = ['top', 'bottom'], glow = 'blue', style }: {
  children: React.ReactNode; edges?: Edge[]; glow?: 'blue' | 'warm' | 'red' | 'none'; style?: StyleProp<ViewStyle>;
}) {
  const tint = { blue: '#E3EEFF', warm: '#FFF1DE', red: '#FFE4E8', none: '#FFFFFF' }[glow];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[tint, '#FFFFFF']} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={edges} style={[{ flex: 1 }, style]}>{children}</SafeAreaView>
    </View>
  );
}

// ---- text --------------------------------------------------------------------------------------------
export function T({ v = 'body', style, ...p }: { v?: keyof typeof type; style?: StyleProp<TextStyle> } & React.ComponentProps<typeof Text>) {
  return <Text {...p} style={[type[v], style]} />;
}

// ---- buttons -----------------------------------------------------------------------------------------
type BtnKind = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'dark';
export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, iconRight, style, small, testID }: {
  title: string; onPress?: () => void; kind?: BtnKind; loading?: boolean; disabled?: boolean;
  icon?: React.ReactNode; iconRight?: React.ReactNode; style?: StyleProp<ViewStyle>; small?: boolean; testID?: string;
}) {
  const h = small ? 44 : 56;
  const textColor = kind === 'primary' || kind === 'danger' || kind === 'dark' ? '#FFFFFF' : kind === 'ghost' ? colors.muted : colors.text;
  const off = disabled || loading;
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress} style={[{ opacity: disabled ? 0.5 : 1 }, style]}>
      {({ pressed }) => {
        const inner = (
          <View style={[styles.btnInner, { height: h }]}>
            {loading ? <ActivityIndicator color={textColor} /> : (
              <>{icon}<Text style={[styles.btnText, { color: textColor, fontFamily: kind === 'primary' || kind === 'danger' ? font.displaySemi : font.semi }]}>{title}</Text>{iconRight}</>
            )}
          </View>
        );
        if (kind === 'primary') {
          return (
            <LinearGradient colors={pressed ? ['#0B5ED7', '#0A4FB5'] : gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.btn, { borderRadius: radius.button }, !pressed && shadow.glow]}>{inner}</LinearGradient>
          );
        }
        const bg = {
          secondary: pressed ? '#E2E5F4' : colors.surface2, danger: pressed ? '#C02C40' : colors.danger,
          ghost: pressed ? colors.surface : 'transparent', outline: pressed ? colors.surface : '#FFFFFF',
          dark: pressed ? '#222' : '#000000',
        }[kind];
        return (
          <View style={[styles.btn, { backgroundColor: bg, borderRadius: radius.button },
            kind === 'outline' && { borderWidth: 1, borderColor: colors.borderStrong },
            kind === 'secondary' && { borderWidth: 1, borderColor: colors.border }]}>{inner}</View>
        );
      }}
    </Pressable>
  );
}

export function IconButton({ children, onPress, label, size = 44, bg = '#FFFFFF', border = true, style, testID }: {
  children: React.ReactNode; onPress?: () => void; label: string; size?: number; bg?: string; border?: boolean;
  style?: StyleProp<ViewStyle>; testID?: string;
}) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 },
        border && { borderWidth: 1, borderColor: colors.border }, style]}>
      {children}
    </Pressable>
  );
}

// ---- chips -------------------------------------------------------------------------------------------
export function Chip({ label, selected, locked, onPress, icon, style, disabled }: {
  label: string; selected?: boolean; locked?: boolean; onPress?: () => void; icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected, disabled: !!disabled }} onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && !selected && { backgroundColor: colors.surface2 }, disabled && { opacity: 0.45 }, style]}>
      {locked ? <Lock size={14} color={colors.warning} strokeWidth={2.2} /> : icon}
      <Text style={[styles.chipText, selected && { color: colors.blue }]}>{label}</Text>
    </Pressable>
  );
}

// ---- inputs ------------------------------------------------------------------------------------------
export const Input = React.forwardRef<TextInputInstance, TextInputProps & { error?: string | null; label?: string; containerStyle?: StyleProp<ViewStyle> }>(
  function Input({ error, label, containerStyle, style, ...p }, ref) {
    const [focused, setFocused] = React.useState(false);
    return (
      <View style={containerStyle}>
        {label ? <T v="caption" style={{ marginBottom: 8 }}>{label}</T> : null}
        <TextInput ref={ref} placeholderTextColor="#9A9EBB" {...p}
          onFocus={(e) => { setFocused(true); p.onFocus?.(e); }} onBlur={(e) => { setFocused(false); p.onBlur?.(e); }}
          style={[styles.input, focused && { borderColor: colors.blue, borderWidth: 1.5 }, !!error && { borderColor: colors.danger }, style]} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  });

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }}
      onPress={() => !disabled && onChange(!value)} hitSlop={8}
      style={[styles.toggle, { backgroundColor: value ? colors.blue : '#D9DCEC', opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.knob, { transform: [{ translateX: value ? 22 : 0 }] }]} />
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, children, testID }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 }}>
      <View style={[styles.box, checked && { backgroundColor: colors.blue, borderColor: colors.blue }]}>
        {checked ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && { borderColor: colors.blue }]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

// ---- brand -------------------------------------------------------------------------------------------
export function LogoMark({ size = 56 }: { size?: number }) {
  const r = size * 0.28;
  const ring = size * 0.2;
  return (
    <LinearGradient colors={gradient.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' }, shadow.glow]}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: ring * 1.6, height: ring * 1.6, borderRadius: ring, borderWidth: size * 0.055, borderColor: '#fff' }} />
        <View style={{ width: ring * 1.6, height: ring * 1.6, borderRadius: ring, borderWidth: size * 0.055, borderColor: '#fff', marginLeft: -ring * 0.55 }} />
      </View>
    </LinearGradient>
  );
}

export function Avatar({ name, uri, size = 48, bg = colors.blue }: { name?: string | null; uri?: string | null; size?: number; bg?: string }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface2 }} accessibilityIgnoresInvertColors />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: font.display, fontSize: size * 0.4 }}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: colors.blueSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }, style]}>{children}</View>;
}

export function Pill(props: PressableProps & { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Pressable {...props} style={[styles.pill, props.style]}>{props.children}</Pressable>;
}

const styles = StyleSheet.create({
  btn: { width: '100%' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  btnText: { fontSize: 16 },
  chip: {
    height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.borderStrong,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipOn: { backgroundColor: colors.blueSoft, borderColor: colors.blueBorder },
  chipText: { fontFamily: font.medium, fontSize: 14, color: colors.text },
  input: {
    height: 56, borderRadius: radius.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: 18, fontFamily: font.body, fontSize: 16, color: colors.text,
  },
  error: { color: colors.danger, fontFamily: font.medium, fontSize: 12, marginTop: 6 },
  toggle: { width: 50, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: '#B7BBD3', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#B7BBD3', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.blue },
  card: { backgroundColor: '#FFFFFF', borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, height: 36, borderWidth: 1, borderColor: colors.border },
});
