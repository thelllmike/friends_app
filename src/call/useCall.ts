// The call engine: WebSocket signaling + WebRTC peer connection + chat, as one state machine.
//
//   starting -> (camera denied) no_camera
//            -> searching -> matched (in call) -> partner_left | searching (next)
//                         -> no_users
//   any -> reconnecting (socket dropped) | banned | replaced | error
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { api, refreshAccess, tokens, WS_URL } from '@/lib/api';
import { Filters, Partner } from '@/lib/match';
import {
  getLocalStream, MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, stopStream, switchCamera as rtcSwitch,
} from './rtc';

export type Phase = 'starting' | 'no_camera' | 'searching' | 'no_users' | 'matched' | 'partner_left' | 'reconnecting'
  | 'banned' | 'replaced' | 'error';
export type ChatMsg = { id: string; text: string; mine: boolean; ts: number; pending?: boolean };
export type Match = { roomId: string; role: 'caller' | 'callee'; partner: Partner; shared: string[]; matchedAt: number };
export type Ended = { partner: Partner; roomId: string; duration: number | null; shared: string[] };

type Opts = {
  filters: Filters;
  onMatched?: (m: Match) => void;
  onEnded?: (e: Ended) => void;
};

const PLATFORM = Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android';

export function useCall({ filters, onMatched, onEnded }: Opts) {
  const [phase, setPhase] = useState<Phase>('starting');
  const [match, setMatch] = useState<Match | null>(null);
  const [lastEnded, setLastEnded] = useState<Ended | null>(null);
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [front, setFront] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInfo, setSearchInfo] = useState<{ filtersIgnored: boolean; premium: boolean } | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const matchRef = useRef<Match | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const pendingIce = useRef<any[]>([]);
  const iceServers = useRef<{ servers: any[]; expires: number } | null>(null);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const closing = useRef(false);        // we closed the socket on purpose
  const wantQueue = useRef(true);       // rejoin the queue after (re)connect
  const retries = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);
  const cb = useRef({ onMatched, onEnded });
  const connectRef = useRef<() => void>(() => {});
  useEffect(() => { filtersRef.current = filters; cb.current = { onMatched, onEnded }; });

  const send = useCallback((msg: object) => {
    const s = ws.current;
    if (s && s.readyState === 1) s.send(JSON.stringify(msg));
  }, []);

  // ---- peer connection ------------------------------------------------------------------------------
  const closePeer = useCallback(() => {
    const p = pc.current;
    pc.current = null;
    pendingIce.current = [];
    if (p) {
      try { (p as any).onicecandidate = null; (p as any).ontrack = null; (p as any).onconnectionstatechange = null; } catch { /* ignore */ }
      try { p.close(); } catch { /* ignore */ }
    }
    setRemote(null);
    setConnectedAt(null);
    connectedAtRef.current = null;
  }, []);

  const getIceServers = useCallback(async () => {
    const now = Date.now() / 1000;
    if (iceServers.current && iceServers.current.expires - 60 > now) return iceServers.current.servers;
    const r = await api<{ ice_servers: any[]; expires_at: number }>('/turn-credentials');
    iceServers.current = { servers: r.ice_servers, expires: r.expires_at };
    return r.ice_servers;
  }, []);

  const endedInfo = useCallback((): Ended | null => {
    const m = matchRef.current;
    if (!m) return null;
    const dur = connectedAtRef.current ? Math.round((Date.now() - connectedAtRef.current) / 1000) : null;
    return { partner: m.partner, roomId: m.roomId, duration: dur, shared: m.shared };
  }, []);

  const finishMatch = useCallback((serverDuration?: number | null) => {
    const info = endedInfo();
    if (info) {
      if (serverDuration !== undefined && serverDuration !== null) info.duration = serverDuration;
      setLastEnded(info);
      cb.current.onEnded?.(info);
    }
    matchRef.current = null;
    setMatch(null);
    setMessages([]);
    closePeer();
    return info;
  }, [closePeer, endedInfo]);

  const createPeer = useCallback(async (m: Match) => {
    closePeer();
    const servers = await getIceServers();
    const p = new RTCPeerConnection({ iceServers: servers, iceCandidatePoolSize: 2 } as any);
    pc.current = p;
    localRef.current?.getTracks().forEach((t) => p.addTrack(t as any, localRef.current as any));
    (p as any).onicecandidate = (e: any) => {
      if (e.candidate && pc.current === p) send({ type: 'ice_candidate', candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
    };
    (p as any).ontrack = (e: any) => {
      if (pc.current !== p) return;
      const s = e.streams?.[0];
      if (s) setRemote(s);
    };
    (p as any).onconnectionstatechange = () => {
      if (pc.current !== p) return;
      const st = (p as any).connectionState;
      if (st === 'connected' && !connectedAtRef.current) {
        connectedAtRef.current = Date.now();
        setConnectedAt(connectedAtRef.current);
      }
      if (st === 'failed') {
        // Media path broke (network change). Ask the server for someone new.
        setError('Connection lost');
        finishMatch();
        send({ type: 'next' });
        setPhase('searching');
      }
    };
    if (m.role === 'caller') {
      const offer = await p.createOffer({} as any);
      await p.setLocalDescription(offer as any);
      send({ type: 'offer', sdp: { type: (offer as any).type, sdp: (offer as any).sdp } });
    }
    return p;
  }, [closePeer, getIceServers, send, finishMatch]);

  const flushIce = async (p: RTCPeerConnection) => {
    const list = pendingIce.current;
    pendingIce.current = [];
    for (const c of list) { try { await p.addIceCandidate(new RTCIceCandidate(c) as any); } catch { /* stale */ } }
  };

  // ---- signaling ------------------------------------------------------------------------------------
  const joinQueue = useCallback(() => {
    wantQueue.current = true;
    setPhase('searching');
    send({ type: 'join_queue', filters: filtersRef.current });
  }, [send]);

  const handle = useCallback(async (msg: any) => {
    switch (msg.type) {
      case 'connected':
        retries.current = 0;
        if (heartbeat.current) clearInterval(heartbeat.current);
        heartbeat.current = setInterval(() => send({ type: 'ping' }), Math.max(5, (msg.heartbeat_seconds || 25) - 5) * 1000);
        if (wantQueue.current) joinQueue();
        break;
      case 'searching':
        setPhase('searching');
        setSearchInfo({ filtersIgnored: !!msg.filters_ignored, premium: !!msg.premium });
        break;
      case 'no_users_found':
        setPhase('no_users');
        break;
      case 'matched': {
        const m: Match = { roomId: msg.room_id, role: msg.role, partner: msg.partner, shared: msg.shared_interests || [], matchedAt: Date.now() };
        matchRef.current = m;
        setMatch(m);
        setMessages([]);
        setError(null);
        setPhase('matched');
        cb.current.onMatched?.(m);
        try { await createPeer(m); } catch (e: any) { setError(e?.message || 'Could not start the call'); }
        break;
      }
      case 'offer': {
        if (!matchRef.current || msg.room_id !== matchRef.current.roomId) break;
        const p = pc.current ?? (await createPeer({ ...matchRef.current, role: 'callee' }));
        await p.setRemoteDescription(new RTCSessionDescription(msg.sdp) as any);
        await flushIce(p);
        const answer = await p.createAnswer();
        await p.setLocalDescription(answer as any);
        send({ type: 'answer', sdp: { type: (answer as any).type, sdp: (answer as any).sdp } });
        break;
      }
      case 'answer': {
        const p = pc.current;
        if (!p || !matchRef.current || msg.room_id !== matchRef.current.roomId) break;
        await p.setRemoteDescription(new RTCSessionDescription(msg.sdp) as any);
        await flushIce(p);
        break;
      }
      case 'ice_candidate': {
        const p = pc.current;
        if (!matchRef.current || msg.room_id !== matchRef.current.roomId || !msg.candidate) break;
        if (p && (p as any).remoteDescription) { try { await p.addIceCandidate(new RTCIceCandidate(msg.candidate) as any); } catch { /* ignore */ } }
        else pendingIce.current.push(msg.candidate);
        break;
      }
      case 'chat':
        setMessages((m) => [...m, { id: msg.id, text: msg.text, mine: false, ts: Date.now() }]);
        break;
      case 'chat_ack':
        setMessages((m) => m.map((x) => (x.id === msg.client_msg_id ? { ...x, id: msg.id, pending: false } : x)));
        break;
      case 'partner_left':
        if (matchRef.current && msg.room_id === matchRef.current.roomId) {
          finishMatch(msg.duration_seconds);
          wantQueue.current = false;
          setPhase('partner_left');
        }
        break;
      case 'call_ended':
        // Our own leave/next/report ended it; local state was already updated.
        break;
      case 'error':
        if (msg.code === 'maintenance') { wantQueue.current = false; setError(msg.message); setPhase('error'); }
        else if (msg.code === 'rate_limited' || msg.code === 'chat_disabled' || msg.code === 'chat_rate_limited') setError(msg.message);
        else setError(msg.message || 'Something went wrong');
        break;
      default:
        break;
    }
  }, [createPeer, finishMatch, joinQueue, send]);

  const connect = useCallback(async () => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    closing.current = false;
    if (!tokens.access) await refreshAccess();
    const token = tokens.access;
    if (!token) { setError('Please sign in again'); setPhase('error'); return; }
    const url = `${WS_URL}?platform=${PLATFORM}`;
    // Browsers can't set WebSocket headers, so web passes the token in the query string.
    const sock: WebSocket = Platform.OS === 'web'
      ? new WebSocket(`${url}&token=${encodeURIComponent(token)}`)
      : new (WebSocket as any)(url, null, { headers: { Authorization: `Bearer ${token}` } });
    ws.current = sock;
    sock.onmessage = (e) => { try { handle(JSON.parse(String(e.data))); } catch { /* bad frame */ } };
    sock.onclose = async (e) => {
      if (ws.current !== sock) return;
      ws.current = null;
      if (heartbeat.current) { clearInterval(heartbeat.current); heartbeat.current = null; }
      if (closing.current) return;
      const wasInCall = !!matchRef.current;
      if (wasInCall) { finishMatch(); setPhase('partner_left'); wantQueue.current = false; }
      if (e.code === 4403) { setPhase('banned'); return; }
      if (e.code === 4409) { setPhase('replaced'); return; }
      if (e.code === 4410) { setPhase('error'); setError('This account was deleted'); return; }
      if (e.code === 4401) { if (await refreshAccess()) { connectRef.current(); return; } setPhase('error'); setError('Please sign in again'); return; }
      // Network drop / server restart / idle: back off and reconnect.
      retries.current += 1;
      if (!wasInCall) setPhase('reconnecting');
      const delay = Math.min(15000, 600 * 2 ** Math.min(retries.current, 5));
      reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
    };
  }, [finishMatch, handle]);
  useEffect(() => { connectRef.current = connect; }, [connect]);

  // ---- lifecycle ------------------------------------------------------------------------------------
  const start = useCallback(async () => {
    setPhase('starting');
    setError(null);
    try {
      if (!localRef.current) {
        const s = await getLocalStream(true);
        localRef.current = s;
        setLocal(s);
      }
    } catch {
      setPhase('no_camera');
      return;
    }
    wantQueue.current = true;
    if (ws.current && ws.current.readyState === 1) joinQueue();
    else connect();
  }, [connect, joinQueue]);

  const shutdown = useCallback(() => {
    closing.current = true;
    wantQueue.current = false;
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (heartbeat.current) clearInterval(heartbeat.current);
    const s = ws.current;
    ws.current = null;
    if (s) {
      try { if (s.readyState === 1) s.send(JSON.stringify({ type: 'leave' })); } catch { /* ignore */ }
      try { s.close(1000); } catch { /* ignore */ }
    }
    if (matchRef.current) finishMatch();
    closePeer();
    stopStream(localRef.current);
    localRef.current = null;
    setLocal(null);
  }, [closePeer, finishMatch]);

  useEffect(() => {
    // Imperative bootstrap: opens the camera and the socket once per screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    return shutdown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the app ends the call on phones (the OS suspends the camera and the app in the background).
  // On the web a hidden tab keeps the camera, audio and connection running, so switching tabs must
  // not end the call.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background' && matchRef.current) {
        send({ type: 'leave' });
        finishMatch();
        wantQueue.current = false;
        setPhase('partner_left');
      }
    });
    return () => sub.remove();
  }, [finishMatch, send]);

  // ---- user actions ---------------------------------------------------------------------------------
  const next = useCallback(() => {
    if (matchRef.current) { finishMatch(); send({ type: 'next' }); setPhase('searching'); wantQueue.current = true; }
    else joinQueue();
  }, [finishMatch, joinQueue, send]);

  const cancelSearch = useCallback(() => { wantQueue.current = false; send({ type: 'leave' }); }, [send]);

  const hangUp = useCallback(() => {
    wantQueue.current = false;
    send({ type: 'leave' });
    if (matchRef.current) finishMatch();
  }, [finishMatch, send]);

  const sendChat = useCallback((text: string) => {
    const t = text.trim().slice(0, 500);
    if (!t || !matchRef.current) return;
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((m) => [...m, { id, text: t, mine: true, ts: Date.now(), pending: true }]);
    send({ type: 'chat', text: t, client_msg_id: id });
  }, [send]);

  const toggleMic = useCallback(() => {
    const on = !micOn;
    localRef.current?.getAudioTracks().forEach((t) => { t.enabled = on; });
    setMicOn(on);
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const on = !camOn;
    localRef.current?.getVideoTracks().forEach((t) => { t.enabled = on; });
    setCamOn(on);
  }, [camOn]);

  const flipCamera = useCallback(async () => {
    if (!localRef.current) return;
    const f = !front;
    try {
      const s = await rtcSwitch(localRef.current, pc.current, f);
      setFront(f);
      setLocal(null); setLocal(s); // re-render previews with the new track
    } catch { setError("Couldn't switch camera"); }
  }, [front]);

  /** Report the current (or just-ended) partner. The server ends the call; we then keep searching or stay put. */
  const report = useCallback(async (reason: string, block: boolean, roomId?: string) => {
    const room = roomId || matchRef.current?.roomId;
    if (!room) return;
    const inCall = !!matchRef.current && matchRef.current.roomId === room;
    await api('/reports', { method: 'POST', body: { room_id: room, reason, block } });
    if (inCall) finishMatch();
  }, [finishMatch]);

  return {
    phase, setPhase, match, lastEnded, local, remote, connectedAt, messages, micOn, camOn, front, error, setError, searchInfo,
    start, next, joinQueue, cancelSearch, hangUp, shutdown, sendChat, toggleMic, toggleCam, flipCamera, report,
  };
}
