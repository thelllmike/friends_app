// Keeps a call alive while the app is in the background. Android: a foreground service with an
// ongoing notification (camera + microphone). Other platforms: no-op (iOS keeps audio via the
// "audio" background mode; browsers keep hidden tabs running).
import { requireOptionalNativeModule } from 'expo';

type Native = { start(title: string, text: string): boolean; stop(): void };
const native = requireOptionalNativeModule<Native>('CallService');

export function startCallService(title = 'Friends', text = 'Video chat in progress. Tap to return.'): boolean {
  try { return native?.start(title, text) ?? false; } catch { return false; }
}

export function stopCallService(): void {
  try { native?.stop(); } catch { /* not running */ }
}
