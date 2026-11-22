// Web build: native Google/Apple SDKs aren't available, so web users sign in with their phone number.
export const googleAvailable = false;
export const appleSupportedPlatform = false;
export class Cancelled extends Error {}
export async function appleAvailable() { return false; }
export async function googleIdToken(): Promise<string> { throw new Error('Google sign-in is available in the mobile app.'); }
export async function googleSignOut() {}
export async function appleCredential(): Promise<{ identityToken: string; displayName: string | null }> {
  throw new Error('Sign in with Apple is available in the iOS app.');
}
