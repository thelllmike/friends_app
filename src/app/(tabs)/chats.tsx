// Chats tab: people you met recently (kept on this device only), with report / block.
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ban, Flag, MessageCircle } from 'lucide-react-native';
import { Avatar, Button, Screen, T } from '@/components/ui';
import { ReportSheet } from '@/components/ReportSheet';
import { confirm } from '@/components/Rows';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import { RecentPerson, useMatch } from '@/lib/match';
import { colors, font, shadow } from '@/lib/theme';

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const dur = (s: number | null) => (s ? (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`) : 'didn’t connect');

export default function Chats() {
  const router = useRouter();
  const { recent, removeRecent, countryName } = useMatch();
  const [reporting, setReporting] = useState<RecentPerson | null>(null);

  const block = async (p: RecentPerson) => {
    if (!(await confirm(`Block ${p.display_name || 'this person'}?`, 'You won’t be matched with them again.', 'Block', true))) return;
    try { await api('/blocks', { method: 'POST', body: { user_id: p.id } }); removeRecent(p.id); toast('Blocked'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <Screen edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <T v="h1" accessibilityRole="header">Chats</T>
        <T style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>People you met recently. Only saved on this phone.</T>
      </View>
      <FlatList data={recent} keyExtractor={(p) => p.room_id} contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><MessageCircle size={34} color={colors.blue} /></View>
            <T v="title" style={{ marginTop: 18 }}>No chats yet</T>
            <T style={{ color: colors.muted, textAlign: 'center', marginTop: 6, fontSize: 14 }}>People you meet on video show up here.</T>
            <Button title="Start video chat" onPress={() => router.push('/call')} style={{ marginTop: 22, width: 220 }} small />
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.display_name} uri={item.photo_url} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>{item.display_name || 'Someone'}{item.age ? `, ${item.age}` : ''}</Text>
              <Text style={styles.meta} numberOfLines={1}>{[countryName(item.country), ago(item.met_at), dur(item.duration_seconds)].filter(Boolean).join(' · ')}</Text>
            </View>
            <Pressable onPress={() => setReporting(item)} hitSlop={6} style={styles.act} accessibilityRole="button" accessibilityLabel={`Report ${item.display_name || 'user'}`}><Flag size={17} color={colors.muted} /></Pressable>
            <Pressable onPress={() => block(item)} hitSlop={6} style={styles.act} accessibilityRole="button" accessibilityLabel={`Block ${item.display_name || 'user'}`}><Ban size={17} color={colors.muted} /></Pressable>
          </View>
        )} />
      <ReportSheet visible={!!reporting} name={reporting?.display_name || 'this user'} onClose={() => setReporting(null)}
        onSubmit={async (reason, blk) => {
          await api('/reports', { method: 'POST', body: { room_id: reporting!.room_id, reason, block: blk } });
          if (blk) removeRecent(reporting!.id);
          setReporting(null);
          toast('Thanks, we’ll review your report.');
        }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 12, ...shadow.card, shadowOpacity: 0.04 },
  name: { fontFamily: font.semi, fontSize: 15, color: colors.text },
  meta: { fontFamily: font.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  act: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
