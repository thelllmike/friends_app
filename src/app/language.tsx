import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { Screen } from '@/components/ui';
import { Group, Row, SubHeader } from '@/components/Rows';
import { toast } from '@/components/Toast';
import { api, Me } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { languageName } from '@/lib/languages';
import { colors } from '@/lib/theme';

export default function Language() {
  const { me, setMe } = useAuth();
  const [langs, setLangs] = useState<string[] | null>(null);
  useEffect(() => { api<string[]>('/meta/languages', { auth: false }).then(setLangs).catch(() => setLangs(['en'])); }, []);

  const pick = async (code: string) => {
    try { setMe(await api<Me>('/me', { method: 'PATCH', body: { language: code } })); toast(`Language: ${languageName(code)}`); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <Screen>
      <SubHeader title="Language" />
      {langs === null ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Group title="App language">
            {langs.map((l) => <Row key={l} label={languageName(l)} onPress={() => pick(l)}
              right={me?.language === l ? <Check size={18} color={colors.blue} /> : <></>} />)}
          </Group>
        </ScrollView>
      )}
    </Screen>
  );
}
