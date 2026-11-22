// Browser WebRTC with the same surface as rtc.tsx (native).
import React, { useEffect, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export const RTCPeerConnection = globalThis.RTCPeerConnection;
export const RTCSessionDescription = globalThis.RTCSessionDescription;
export const RTCIceCandidate = globalThis.RTCIceCandidate;
export type MediaStream = globalThis.MediaStream;
export type RTCPeerConnection = globalThis.RTCPeerConnection;

export async function getLocalStream(front = true): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('Camera not supported'), { name: 'NotSupportedError' });
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: { facingMode: front ? 'user' : 'environment', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
  });
}

/** Browsers can't flip a live track: open the other camera and swap the track on the sender. */
export async function switchCamera(stream: MediaStream, pc: RTCPeerConnection | null, front: boolean): Promise<MediaStream> {
  const old = stream.getVideoTracks()[0];
  const fresh = await navigator.mediaDevices.getUserMedia({ video: { facingMode: front ? 'user' : 'environment' } });
  const track = fresh.getVideoTracks()[0];
  track.enabled = old ? old.enabled : true;
  const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');
  if (sender) await sender.replaceTrack(track);
  if (old) { stream.removeTrack(old); old.stop(); }
  stream.addTrack(track);
  return stream;
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function VideoView({ stream, mirror, style, cover = true }: { stream: MediaStream | null; mirror?: boolean; style?: StyleProp<ViewStyle>; cover?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  if (!stream) return null;
  return (
    <View style={[styles.wrap, style]}>
      {React.createElement('video', {
        ref, autoPlay: true, playsInline: true, muted: !!mirror,
        style: { width: '100%', height: '100%', objectFit: cover ? 'cover' : 'contain', transform: mirror ? 'scaleX(-1)' : undefined, background: 'transparent' },
      })}
    </View>
  );
}

export const isWeb = true;

const styles = StyleSheet.create({ wrap: { overflow: 'hidden' } });
