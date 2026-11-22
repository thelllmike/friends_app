// Native WebRTC (react-native-webrtc). rtc.web.tsx provides the same API with browser WebRTC.
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView,
} from 'react-native-webrtc';

export { MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription };

export async function getLocalStream(front = true): Promise<MediaStream> {
  return mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode: front ? 'user' : 'environment', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
  }) as Promise<MediaStream>;
}

/** Flip front/back camera in place (no renegotiation needed). */
export async function switchCamera(stream: MediaStream, _pc: RTCPeerConnection | null, front: boolean): Promise<MediaStream> {
  const track: any = stream.getVideoTracks()[0];
  if (!track) return stream;
  try {
    await track.applyConstraints({ facingMode: front ? 'user' : 'environment' });
  } catch {
    track._switchCamera?.();
  }
  return stream;
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => { try { t.stop(); } catch { /* ignore */ } });
  try { (stream as any)?.release?.(); } catch { /* ignore */ }
}

export function VideoView({ stream, mirror, style, cover = true }: { stream: MediaStream | null; mirror?: boolean; style?: StyleProp<ViewStyle>; cover?: boolean }) {
  if (!stream) return null;
  return <RTCView streamURL={stream.toURL()} mirror={mirror} objectFit={cover ? 'cover' : 'contain'} style={style} zOrder={mirror ? 1 : 0} />;
}

export const isWeb = false;
