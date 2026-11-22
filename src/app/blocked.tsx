// Blocked users: list + unblock.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Avatar, Screen, T } from '@/components/ui';
import { confirm, SubHeader } from '@/components/Rows';
import { toast } from '@/components/Toast';
import { api } from '@/lib/api';
import { colors, font } from '@/lib/theme';

type Blocked = { user_id: string; display_name: string | null; photo_url: string | null; blocked_at: string };

export default function BlockedUsers() {
  const [list, setList] = useState<Blocked[] | null>(null);
  const load = useCallback(() => { api<Blocked[]>('/blocks').then(setList).catch((e) => { toast(e.message, 'error'); setList([]); }); }, []);
  useFocusEffect(load);

  const unblock = async (b: Blocked) => {
    if (!(await confirm(`Unblock ${b.display_name || 'this user'}?`, 'You could be matched with them again.', 'Unblock'))) return;
    try { await api(`/blocks/${b.user_id}`, { method: 'DELETE' }); setList((l) => l?.filter((x) => x.user_id !== b.user_id) ?? null); toast('Unblocked'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <Screen>
      <SubHeader title="Blocked users" />
      {list === null ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /> : (
        <FlatList data={list} keyExtractor={(b) => b.user_id} contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<T style={styles.empty}>You haven’t blocked anyone. Blocked people are never matched with you.</T>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar name={item.display_name} uri={item.photo_url} size={44} bg="#8C93B8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.display_name || 'Someone'}</Text>
                <Text style={styles.date}>Blocked {new Date(item.blocked_at).toLocaleDateString()}</Text>
              </View>
              <Pressable onPress={() => unblock(item)} style={styles.btn} accessibilityRole="button"><Text style={styles.btnText}>Unblock</Text></Pressable>
            </View>
          )} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', color: colors.muted, marginTop: 60, paddingHorizontal: 24, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12 },
  name: { fontFamily: font.semi, fontSize: 15, color: colors.text },
  date: { fontFamily: font.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  btn: { backgroundColor: colors.surface2, borderRadius: 14, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  btnText: { fontFamily: font.semi, fontSize: 13, color: colors.text },
});
