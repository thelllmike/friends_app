// Native Google / Apple sign-in. Returns the provider's ID token; the backend verifies it.
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
let configured = false;

export const googleAvailable = !!WEB_CLIENT_ID;
export const appleSupportedPlatform = Platform.OS === 'ios';

export class Cancelled extends Error {}

export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try { return await AppleAuthentication.isAvailableAsync(); } catch { return false; }
}

export async function googleIdToken(): Promise<string> {
  if (!WEB_CLIENT_ID) throw new Error('Google sign-in is not set up yet (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).');
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
    configured = true;
  }
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type === 'cancelled') throw new Cancelled();
    const token = res.data.idToken;
    if (!token) throw new Error('Google did not return an ID token');
    return token;
  } catch (e) {
    if (e instanceof Cancelled) throw e;
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) throw new Cancelled();
    throw e;
  }
}

export async function googleSignOut() {
  if (configured) { try { await GoogleSignin.signOut(); } catch { /* ignore */ } }
}

export async function appleCredential(): Promise<{ identityToken: string; displayName: string | null }> {
  try {
    const c = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!c.identityToken) throw new Error('Apple did not return an identity token');
    const name = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(' ').trim();
    return { identityToken: c.identityToken, displayName: name || null };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') throw new Cancelled();
    throw e;
  }
}
