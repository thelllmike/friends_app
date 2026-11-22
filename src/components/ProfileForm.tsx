// Profile fields (design 06): photo, display name, age, country, gender, up to 5 interests.
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown } from 'lucide-react-native';
import { Avatar, Button, Chip, Input, T } from './ui';
import { CountryPicker } from './CountryPicker';
import { toast } from './Toast';
import { api, ApiError, Me } from '@/lib/api';
import { GENDERS, INTERESTS, useMatch } from '@/lib/match';
import { colors, font, radius } from '@/lib/theme';

async function uploadPhoto(uri: string, mime?: string | null, name?: string | null): Promise<Me> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name || 'photo.jpg');
  } else {
    // React Native's FormData accepts {uri, name, type} file descriptors.
    form.append('file', { uri, name: name || 'photo.jpg', type: mime || 'image/jpeg' } as any);
  }
  return api<Me>('/me/photo', { method: 'POST', form });
}

export function ProfileForm({ me, submitLabel, onSaved }: { me: Me; submitLabel: string; onSaved: (m: Me) => void }) {
  const { countryName } = useMatch();
  const [name, setName] = useState(me.display_name || '');
  const [age, setAge] = useState(me.age ? String(me.age) : '');
  const [country, setCountry] = useState<string | null>(me.country);
  const [gender, setGender] = useState<string | null>(me.gender);
  const [interests, setInterests] = useState<string[]>(me.interests || []);
  const [photo, setPhoto] = useState<{ uri: string; mime?: string | null; name?: string | null } | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pick = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { toast('Allow photo access in Settings to add a picture', 'error'); return; }
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!r.canceled && r.assets[0]) setPhoto({ uri: r.assets[0].uri, mime: r.assets[0].mimeType, name: r.assets[0].fileName });
  };

  const toggleInterest = (i: string) => setInterests((cur) => {
    if (cur.includes(i)) return cur.filter((x) => x !== i);
    if (cur.length >= 5) { toast('Pick up to 5 interests'); return cur; }
    return [...cur, i];
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Use at least 2 characters';
    const n = Number(age);
    if (!age) e.age = 'Enter your age';
    else if (!Number.isInteger(n) || n < 18) e.age = 'You must be 18 or older.';
    else if (n > 120) e.age = 'Enter a real age';
    if (!country) e.country = 'Choose your country';
    if (!gender) e.gender = 'Choose one';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      let m = await api<Me>('/me', { method: 'PATCH', body: { display_name: name.trim(), age: Number(age), country, gender, interests } });
      if (photo) {
        try { m = await uploadPhoto(photo.uri, photo.mime, photo.name); } catch (e: any) { toast(e.message || 'Photo upload failed', 'error'); }
      }
      onSaved(m);
    } catch (e) {
      const err = e as ApiError;
      toast(err.message, 'error');
    } finally { setBusy(false); }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.nameRow}>
          <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Change profile photo" style={styles.photo}>
            {photo || me.photo_url ? <Avatar uri={photo?.uri || me.photo_url} size={84} /> : (
              <View style={styles.photoEmpty}><View style={styles.head} /><View style={styles.body} /></View>
            )}
            <View style={styles.camBadge}><Camera size={14} color="#fff" /></View>
          </Pressable>
          <Input testID="profile-name" containerStyle={{ flex: 1 }} label="Display name" value={name} onChangeText={setName} maxLength={40}
            placeholder="Your first name" autoCapitalize="words" error={errors.name} />
        </View>

        <View style={styles.row2}>
          <Input testID="profile-age" containerStyle={{ width: 120 }} label="Age" value={age} onChangeText={(v) => setAge(v.replace(/\D/g, ''))}
            keyboardType="number-pad" maxLength={3} placeholder="18+" error={errors.age} />
          <View style={{ flex: 1 }}>
            <T v="caption" style={{ marginBottom: 8 }}>Country</T>
            <Pressable testID="profile-country" onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={`Country, ${country ? countryName(country) : 'not set'}`}
              style={[styles.select, !!errors.country && { borderColor: colors.danger }]}>
              {country ? <Text style={styles.cc}>{country}</Text> : null}
              <Text style={[styles.selectText, !country && { color: '#9A9EBB' }]} numberOfLines={1}>{country ? countryName(country) : 'Select'}</Text>
              <ChevronDown size={18} color={colors.muted} />
            </Pressable>
            {errors.country ? <Text style={styles.err}>{errors.country}</Text> : null}
          </View>
        </View>

        <T v="caption" style={styles.label}>Gender</T>
        <View style={styles.genders}>
          {GENDERS.map((g) => (
            <Pressable key={g.id} onPress={() => setGender(g.id)} accessibilityRole="radio" accessibilityState={{ selected: gender === g.id }}
              style={[styles.gender, gender === g.id && styles.genderOn]}>
              <Text style={[styles.genderText, gender === g.id && { color: colors.blue }]}>{g.label}</Text>
            </Pressable>
          ))}
        </View>
        {errors.gender ? <Text style={styles.err}>{errors.gender}</Text> : null}

        <T v="caption" style={styles.label}>Interests (pick up to 5)</T>
        <View style={styles.chips}>
          {INTERESTS.map((i) => <Chip key={i} label={i} selected={interests.includes(i)} onPress={() => toggleInterest(i)} />)}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12, paddingTop: 8 }}>
        <Button testID="profile-save" title={submitLabel} onPress={save} loading={busy} />
      </View>
      <CountryPicker visible={picker} value={country} onClose={() => setPicker(false)} onPick={(c) => { setCountry(c); setPicker(false); }} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 8 },
  photo: { width: 84, height: 84, marginBottom: 0 },
  photoEmpty: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#DCE8FF', borderWidth: 2, borderColor: colors.blue, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center' },
  head: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(24,119,242,0.25)', marginTop: 16 },
  body: { width: 60, height: 40, borderRadius: 30, backgroundColor: 'rgba(24,119,242,0.25)', marginTop: 6 },
  camBadge: { position: 'absolute', right: -2, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  row2: { flexDirection: 'row', gap: 12, marginTop: 20 },
  select: { height: 56, borderRadius: radius.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cc: { fontFamily: font.semi, fontSize: 12, color: colors.muted },
  selectText: { flex: 1, fontFamily: font.body, fontSize: 16, color: colors.text },
  label: { marginTop: 24, marginBottom: 10 },
  genders: { flexDirection: 'row', gap: 10 },
  gender: { flex: 1, height: 48, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  genderOn: { backgroundColor: colors.blueSoft, borderColor: colors.blueBorder },
  genderText: { fontFamily: font.medium, fontSize: 15, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  err: { color: colors.danger, fontFamily: font.medium, fontSize: 12, marginTop: 6 },
});
