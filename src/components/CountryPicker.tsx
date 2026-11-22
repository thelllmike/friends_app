// Searchable country list in a modal.
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Search, X } from 'lucide-react-native';
import { IconButton, T } from './ui';
import { useMatch } from '@/lib/match';
import { colors, font } from '@/lib/theme';

export function CountryPicker({ visible, value, onPick, onClose, allowAnywhere }: {
  visible: boolean; value: string | null; onPick: (code: string) => void; onClose: () => void; allowAnywhere?: boolean;
}) {
  const { countries, countryName } = useMatch();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const items = countries.map((c) => ({ code: c.code, name: countryName(c.code) }))
      .filter((c) => !s || c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s);
    return allowAnywhere && !s ? [{ code: 'Anywhere', name: 'Anywhere' }, ...items] : items;
  }, [countries, countryName, q, allowAnywhere]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
        <View style={styles.head}>
          <T v="title">Choose country</T>
          <IconButton label="Close" onPress={onClose}><X size={20} color={colors.text} /></IconButton>
        </View>
        <View style={styles.search}>
          <Search size={18} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor="#9A9EBB" style={styles.searchInput}
            autoCorrect={false} accessibilityLabel="Search countries" />
        </View>
        <FlatList data={list} keyExtractor={(c) => c.code} keyboardShouldPersistTaps="handled" initialNumToRender={30}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onPick(item.code); setQ(''); }} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}
              accessibilityRole="button" accessibilityState={{ selected: item.code === value }}>
              <Text style={styles.code}>{item.code === 'Anywhere' ? '🌍' : item.code}</Text>
              <Text style={styles.name}>{item.name}</Text>
              {item.code === value ? <Check size={18} color={colors.blue} /> : null}
            </Pressable>
          )} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 8, height: 48, borderRadius: 16, backgroundColor: colors.surface, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: font.body, fontSize: 16, color: colors.text, height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 52 },
  code: { width: 30, fontFamily: font.semi, fontSize: 13, color: colors.muted },
  name: { flex: 1, fontFamily: font.body, fontSize: 16, color: colors.text },
});
