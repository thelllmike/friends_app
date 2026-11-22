// Report and block sheet (design 10).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { Button, Radio, T, Toggle } from './ui';
import { colors, font } from '@/lib/theme';

export const REASONS = [
  { id: 'nudity_or_sexual', label: 'Nudity or sexual content' },
  { id: 'harassment_or_bullying', label: 'Harassment or bullying' },
  { id: 'spam_or_scam', label: 'Spam or scam' },
  { id: 'underage', label: 'Underage user' },
  { id: 'other', label: 'Other' },
];

export function ReportSheet({ visible, name, onClose, onSubmit }: {
  visible: boolean; name: string; onClose: () => void; onSubmit: (reason: string, block: boolean) => Promise<void>;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) { setErr('Choose a reason'); return; }
    setBusy(true); setErr(null);
    try { await onSubmit(reason, block); setReason(null); setBlock(true); }
    catch (e: any) { setErr(e?.message || 'Could not send the report'); }
    finally { setBusy(false); }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <T v="h2" accessibilityRole="header">Report {name}</T>
      <T style={{ color: colors.muted, fontSize: 14, marginTop: 6, marginBottom: 16 }}>Tell us what happened. Reports are private and the call will end.</T>
      <View style={{ gap: 10 }} accessibilityRole="radiogroup">
        {REASONS.map((r) => (
          <Pressable key={r.id} onPress={() => { setReason(r.id); setErr(null); }} accessibilityRole="radio" accessibilityState={{ selected: reason === r.id }}
            style={[styles.row, reason === r.id && styles.rowOn]}>
            <Text style={styles.rowText}>{r.label}</Text>
            <Radio selected={reason === r.id} />
          </Pressable>
        ))}
      </View>
      <View style={styles.block}>
        <View style={{ flex: 1 }}>
          <T v="bodyStrong">Block this user</T>
          <T v="caption" style={{ fontSize: 12 }}>You will not be matched again</T>
        </View>
        <Toggle value={block} onChange={setBlock} label="Block this user" />
      </View>
      {err ? <Text style={styles.err} accessibilityRole="alert">{err}</Text> : null}
      <Button testID="report-submit" title="Submit report" onPress={submit} loading={busy} />
      <Button title="Cancel" kind="ghost" onPress={onClose} style={{ marginTop: 4 }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { height: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  rowOn: { borderColor: colors.blue, backgroundColor: 'rgba(24,119,242,0.05)' },
  rowText: { fontFamily: font.medium, fontSize: 15, color: colors.text },
  block: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 16, paddingHorizontal: 4 },
  err: { color: colors.danger, fontFamily: font.medium, fontSize: 13, marginBottom: 10 },
});
