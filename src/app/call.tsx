// Searching (08), Video call (09), In-call chat (11), Report (10), No users (16), Partner left (17), No camera (14).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera, CameraOff, ChevronDown, Flag, Heart, LogOut, MessageCircle, Mic, MicOff, PhoneOff, Radio as RadioIcon, Send,
  SkipForward, SwitchCamera, Users, Video, VideoOff, CircleAlert,
} from 'lucide-react-native';
import { useCall } from '@/call/useCall';
import { isWeb, VideoView } from '@/call/rtc';
import { RemotePlaceholder } from '@/components/Illustrations';
import { ReportSheet } from '@/components/ReportSheet';
import { StateScreen } from '@/components/StateScreen';
import { toast } from '@/components/Toast';
import { Avatar, Button, T } from '@/components/ui';
import { useMatch } from '@/lib/match';
import { colors, font, gradient, shadow } from '@/lib/theme';

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function useTimer(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
}

function Pulse() {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v]);
  const ring = (delay: number) => {
    const p = Animated.modulo(Animated.add(v, delay), 1);
    return { transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }], opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }) };
  };
  return (
    <View style={styles.pulseWrap}>
      {[0, 0.33, 0.66].map((d) => <Animated.View key={d} style={[styles.pulseRing, ring(d)]} />)}
      <LinearGradient colors={gradient.accent} style={[styles.pulseCore, shadow.glow]}><RadioIcon size={34} color="#fff" /></LinearGradient>
    </View>
  );
}

function CtrlButton({ onPress, label, children, active = true, danger }: { onPress: () => void; label: string; children: React.ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => [styles.ctrl, danger && { backgroundColor: colors.danger, borderColor: colors.danger },
        !active && !danger && { backgroundColor: 'rgba(255,255,255,0.92)' }, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export default function CallScreen() {
  const router = useRouter();
  const { filters, countryName, addRecent, updateRecent } = useMatch();
  const call = useCall({
    filters,
    onMatched: (m) => addRecent({ ...m.partner, room_id: m.roomId, met_at: new Date().toISOString(), duration_seconds: null, shared_interests: m.shared }),
    onEnded: (e) => updateRecent(e.roomId, { duration_seconds: e.duration }),
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [reportOpen, setReportOpen] = useState<null | 'live' | 'ended'>(null);
  const seconds = useTimer(call.connectedAt);
  const listRef = useRef<FlatList>(null);

  useEffect(() => { if (call.error) { toast(call.error, 'error'); call.setError(null); } }, [call.error]); // eslint-disable-line
  useEffect(() => { if (call.messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50); }, [call.messages.length]);

  const exit = () => {
    call.shutdown();
    if (router.canGoBack()) router.back(); else router.replace('/home');
  };

  const partner = call.match?.partner ?? call.lastEnded?.partner ?? null;
  const partnerName = partner?.display_name || 'This person';
  const filterLabels = useMemo(() => [
    filters.country === 'Anywhere' ? 'Anywhere' : countryName(filters.country),
    filters.gender === 'Anywhere' ? 'Everyone' : filters.gender === 'female' ? 'Women' : filters.gender === 'male' ? 'Men' : 'Other',
  ], [filters, countryName]);

  // ---- full-screen states ---------------------------------------------------------------------------
  if (call.phase === 'no_camera') {
    return (
      <StateScreen tone="red" Icon={CameraOff} title="Camera access is off"
        text="Friends needs your camera and mic to connect you with people."
        primary={{ title: isWeb ? 'Try again' : 'Open Settings', onPress: () => (isWeb ? call.start() : Linking.openSettings()) }}
        secondary={{ title: 'Not now', onPress: exit }}>
        <View style={{ width: '100%', gap: 10, marginTop: 28 }}>
          {['Camera', 'Microphone'].map((l) => (
            <View key={l} style={styles.permRow}><T v="bodyStrong">{l}</T><Text style={{ color: colors.danger, fontFamily: font.semi, fontSize: 13 }}>Off</Text></View>
          ))}
          {!isWeb ? <Pressable onPress={call.start}><T v="caption" style={{ textAlign: 'center', color: colors.blue, marginTop: 6 }}>I’ve turned them on, try again</T></Pressable> : null}
        </View>
      </StateScreen>
    );
  }
  if (call.phase === 'no_users') {
    return (
      <StateScreen tone="blue" Icon={Users} title="No one around right now"
        text={filters.country !== 'Anywhere' || filters.gender !== 'Anywhere'
          ? 'Try again in a moment, or open your filters to widen the search.'
          : 'Try again in a moment. More people join all the time.'}
        primary={{ title: 'Search again', onPress: call.joinQueue }}
        secondary={{ title: filters.country !== 'Anywhere' || filters.gender !== 'Anywhere' ? 'Edit filters' : 'Back to home', onPress: exit }} />
    );
  }
  if (call.phase === 'banned' || call.phase === 'replaced' || call.phase === 'error') {
    const t = call.phase === 'banned'
      ? { title: 'Your account is paused', text: 'You can’t start chats right now because of reports on your account. Try again later.' }
      : call.phase === 'replaced'
        ? { title: 'Friends is open somewhere else', text: 'You started a chat on another device or tab, so this one was closed.' }
        : { title: 'Something went wrong', text: 'We couldn’t start the chat. Check your connection and try again.' };
    return <StateScreen tone="red" Icon={CircleAlert} title={t.title} text={t.text}
      primary={{ title: call.phase === 'banned' ? 'Back to home' : 'Try again', onPress: call.phase === 'banned' ? exit : call.start }}
      secondary={call.phase === 'banned' ? undefined : { title: 'Back to home', onPress: exit }} />;
  }

  const inCall = call.phase === 'matched' && !!call.match;
  const m = call.match;
  const showChat = chatOpen && inCall;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradient.call} style={StyleSheet.absoluteFill} />
      {inCall ? (
        <>
          <RemotePlaceholder />
          {call.remote ? <VideoView stream={call.remote} style={StyleSheet.absoluteFill} /> : null}
          <LinearGradient colors={['rgba(5,12,30,0.55)', 'transparent']} style={styles.topShade} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(5,12,30,0.75)']} style={styles.bottomShade} pointerEvents="none" />
        </>
      ) : null}

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* ---- top bar */}
          <View style={styles.top}>
            {inCall && m ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <View style={styles.partnerPill}>
                  {m.partner.photo_url ? <Avatar uri={m.partner.photo_url} size={34} /> : (
                    <View style={styles.cc}><Text style={styles.ccText}>{m.partner.country || '?'}</Text></View>
                  )}
                  <View>
                    <Text style={styles.pName} numberOfLines={1}>{m.partner.display_name || 'Someone'}{m.partner.age ? `, ${m.partner.age}` : ''}</Text>
                    {m.partner.country ? <Text style={styles.pCountry}>{countryName(m.partner.country)}</Text> : null}
                  </View>
                </View>
                <View style={styles.timer}><Text style={styles.timerText} accessibilityLabel={`Call time ${fmtTime(seconds)}`}>{call.connectedAt ? fmtTime(seconds) : 'Connecting…'}</Text></View>
              </View>
            ) : (
              <View style={styles.camPill}><Video size={16} color="#fff" /><Text style={styles.camPillText}>Your camera</Text></View>
            )}
            {!inCall ? (
              <Pressable style={styles.roundGlass} onPress={call.flipCamera} accessibilityRole="button" accessibilityLabel="Switch camera"><SwitchCamera size={20} color="#fff" /></Pressable>
            ) : null}
          </View>

          {/* ---- self view */}
          {call.local ? (
            <View style={[styles.selfTile, !inCall && styles.selfTileSearching]}>
              {call.camOn ? <VideoView stream={call.local} mirror={call.front} style={StyleSheet.absoluteFill} /> : (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B2C5A' }]}><VideoOff size={22} color="#fff" /></View>
              )}
              <Text style={styles.youLabel}>You</Text>
            </View>
          ) : null}

          {/* ---- middle */}
          {!inCall ? (
            <View style={styles.searchMid}>
              <Pulse />
              <Text style={styles.searchTitle} accessibilityRole="header">
                {call.phase === 'reconnecting' ? 'Reconnecting…' : call.phase === 'starting' ? 'Starting camera…' : 'Finding someone…'}
              </Text>
              <Text style={styles.searchSub}>
                {call.searchInfo?.filtersIgnored ? 'Filters are a Premium feature, so we’re matching you with anyone.' : 'Matching you with someone online right now'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                {filterLabels.map((l) => <View key={l} style={styles.glassChip}><Text style={styles.glassChipText}>{l}</Text></View>)}
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {showChat ? (
                <FlatList ref={listRef} data={call.messages} keyExtractor={(x) => x.id} style={styles.chatList}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8, flexGrow: 1, justifyContent: 'flex-end' }}
                  ListEmptyComponent={<Text style={[styles.searchSub, { textAlign: 'center' }]}>Say hi to {m?.partner.display_name || 'your match'} 👋</Text>}
                  renderItem={({ item }) => (
                    <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs, item.pending && { opacity: 0.7 }]}>
                      <Text style={[styles.bubbleText, item.mine && { color: '#fff' }]}>{item.text}</Text>
                    </View>
                  )} />
              ) : null}
            </View>
          )}

          {/* ---- bottom */}
          {inCall && m ? (
            <View style={styles.bottom}>
              {!showChat && m.shared.length ? (
                <View style={styles.likes}><Heart size={14} color="#FF8FA3" /><Text style={styles.likesText}>You both like {m.shared.slice(0, 2).join(' and ')}</Text></View>
              ) : null}
              {showChat ? (
                <View style={styles.chatBar}>
                  <Pressable style={styles.roundGlass} onPress={() => setChatOpen(false)} accessibilityLabel="Hide chat" accessibilityRole="button"><ChevronDown size={20} color="#fff" /></Pressable>
                  <TextInput testID="chat-input" value={draft} onChangeText={setDraft} placeholder="Say something nice…" placeholderTextColor="rgba(255,255,255,0.6)"
                    style={styles.chatInput} maxLength={500} returnKeyType="send" onSubmitEditing={() => { call.sendChat(draft); setDraft(''); }} blurOnSubmit={false} />
                  <Pressable testID="chat-send" style={[styles.roundGlass, { backgroundColor: colors.blue, borderColor: colors.blue }]} accessibilityLabel="Send" accessibilityRole="button"
                    onPress={() => { call.sendChat(draft); setDraft(''); }}><Send size={18} color="#fff" /></Pressable>
                  <Pressable style={styles.roundGlass} onPress={call.next} accessibilityLabel="Next person" accessibilityRole="button"><SkipForward size={20} color="#fff" /></Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.ctrls}>
                    <CtrlButton label={call.micOn ? 'Mute microphone' : 'Unmute microphone'} onPress={call.toggleMic} active={call.micOn}>
                      {call.micOn ? <Mic size={22} color="#fff" /> : <MicOff size={22} color={colors.text} />}
                    </CtrlButton>
                    <CtrlButton label={call.camOn ? 'Turn camera off' : 'Turn camera on'} onPress={call.toggleCam} active={call.camOn}>
                      {call.camOn ? <Camera size={22} color="#fff" /> : <CameraOff size={22} color={colors.text} />}
                    </CtrlButton>
                    <CtrlButton label="Open chat" onPress={() => setChatOpen(true)}><MessageCircle size={22} color="#fff" /></CtrlButton>
                    <CtrlButton label="Report" onPress={() => setReportOpen('live')}><Flag size={22} color="#fff" /></CtrlButton>
                    <CtrlButton label="End call" danger onPress={() => { call.hangUp(); exit(); }}><PhoneOff size={22} color="#fff" /></CtrlButton>
                  </View>
                  <Button testID="next" title="Next" onPress={call.next} iconRight={<SkipForward size={20} color="#fff" />} />
                </>
              )}
            </View>
          ) : (
            <View style={styles.bottom}>
              <Button title="Cancel" kind="dark" onPress={() => { call.cancelSearch(); exit(); }} style={styles.cancel} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ---- partner left (17) */}
      {call.phase === 'partner_left' ? (
        <View style={[StyleSheet.absoluteFill, styles.leftScrim]}>
          <View style={styles.leftCard}>
            <View style={styles.leftIcon}><LogOut size={26} color="#F0A030" /></View>
            <T v="h2" style={{ textAlign: 'center', marginTop: 18 }} accessibilityRole="header">{partnerName} left the chat</T>
            <T style={{ textAlign: 'center', color: colors.muted, fontSize: 14, marginTop: 8, marginBottom: 22 }}>Connections drop sometimes. Ready to meet someone new?</T>
            <Button testID="find-next" title="Find next" onPress={call.joinQueue} />
            <Button title="Back to home" kind="secondary" onPress={exit} style={{ marginTop: 10 }} />
            {call.lastEnded ? (
              <Pressable onPress={() => setReportOpen('ended')} style={styles.reportLink} accessibilityRole="button">
                <Flag size={14} color={colors.muted} /><Text style={styles.reportLinkText}>Report this user</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <ReportSheet visible={!!reportOpen} name={partnerName} onClose={() => setReportOpen(null)}
        onSubmit={async (reason, block) => {
          const wasLive = reportOpen === 'live';
          await call.report(reason, block, wasLive ? undefined : call.lastEnded?.roomId);
          setReportOpen(null);
          toast(block ? 'Reported and blocked. Thanks for keeping Friends safe.' : 'Thanks, we’ll review your report.');
          if (wasLive) call.joinQueue();
        }} />
    </View>
  );
}

const glass = { backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' };
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 160 },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, minHeight: 56, zIndex: 3 },
  partnerPill: { flexDirection: 'row', alignItems: 'center', gap: 10, ...glass, backgroundColor: 'rgba(10,22,51,0.55)', borderRadius: 26, paddingLeft: 5, paddingRight: 14, height: 48, maxWidth: 220 },
  cc: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ccText: { fontFamily: font.semi, fontSize: 12, color: colors.text },
  pName: { color: '#fff', fontFamily: font.semi, fontSize: 15 },
  pCountry: { color: 'rgba(255,255,255,0.75)', fontFamily: font.body, fontSize: 12 },
  timer: { ...glass, backgroundColor: 'rgba(10,22,51,0.55)', borderRadius: 18, paddingHorizontal: 12, height: 36, justifyContent: 'center' },
  timerText: { color: '#fff', fontFamily: font.semi, fontSize: 14, fontVariant: ['tabular-nums'] },
  camPill: { flexDirection: 'row', alignItems: 'center', gap: 8, ...glass, borderRadius: 18, paddingHorizontal: 14, height: 36 },
  camPillText: { color: '#fff', fontFamily: font.medium, fontSize: 14 },
  roundGlass: { width: 44, height: 44, borderRadius: 22, ...glass, alignItems: 'center', justifyContent: 'center' },
  selfTile: { position: 'absolute', top: 120, right: 16, width: 104, height: 148, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', backgroundColor: '#1B2C5A', zIndex: 2 },
  selfTileSearching: { top: 120, width: 84, height: 120, opacity: 0.9 },
  youLabel: { position: 'absolute', bottom: 6, alignSelf: 'center', color: '#fff', fontFamily: font.semi, fontSize: 12, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  searchMid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  pulseWrap: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
  pulseRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1.5, borderColor: 'rgba(90,160,255,0.8)' },
  pulseCore: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  searchTitle: { color: '#fff', fontFamily: font.display, fontSize: 26, textAlign: 'center' },
  searchSub: { color: 'rgba(255,255,255,0.75)', fontFamily: font.body, fontSize: 15, textAlign: 'center', marginTop: 8 },
  glassChip: { ...glass, borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  glassChipText: { color: '#fff', fontFamily: font.medium, fontSize: 14 },
  bottom: { paddingHorizontal: 16, paddingBottom: 8, gap: 14, zIndex: 3 },
  cancel: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 22, overflow: 'hidden' },
  likes: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, ...glass, backgroundColor: 'rgba(10,22,51,0.6)', borderRadius: 18, paddingHorizontal: 14, height: 36 },
  likesText: { color: '#fff', fontFamily: font.medium, fontSize: 14 },
  ctrls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  ctrl: { width: 56, height: 56, borderRadius: 28, ...glass, backgroundColor: 'rgba(10,22,51,0.55)', alignItems: 'center', justifyContent: 'center' },
  chatList: { flex: 1 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.blue, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(10,22,51,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderBottomLeftRadius: 6 },
  bubbleText: { color: '#fff', fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  chatBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatInput: { flex: 1, height: 48, borderRadius: 24, ...glass, backgroundColor: 'rgba(10,22,51,0.6)', paddingHorizontal: 16, color: '#fff', fontFamily: font.body, fontSize: 15 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 52 },
  leftScrim: { backgroundColor: 'rgba(8,16,40,0.55)', justifyContent: 'center', paddingHorizontal: 20, zIndex: 10 },
  leftCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, ...shadow.card },
  leftIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1DE', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  reportLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  reportLinkText: { color: colors.muted, fontFamily: font.medium, fontSize: 13 },
});
