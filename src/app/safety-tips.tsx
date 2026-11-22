import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { Screen, T } from '@/components/ui';
import { SubHeader } from '@/components/Rows';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

type Tip = { id: string; title: string; body: string };

export default function SafetyTips() {
  const [tips, setTips] = useState<Tip[] | null>(null);
  useEffect(() => { api<Tip[]>('/safety-tips', { auth: false }).then(setTips).catch(() => setTips([])); }, []);
  return (
    <Screen>
      <SubHeader title="Safety tips" />
      {tips === null ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /> : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {tips.map((t) => (
            <View key={t.id} style={styles.card}>
              <View style={styles.icon}><ShieldCheck size={18} color={colors.blue} /></View>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{t.title}</T>
                <T style={{ color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 4 }}>{t.body}</T>
              </View>
            </View>
          ))}
          <T v="caption" style={{ textAlign: 'center', marginTop: 8 }}>If someone makes you uncomfortable, tap the flag during the call to report them.</T>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
});
