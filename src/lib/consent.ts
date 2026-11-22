// Consent the user gave on the login screen; sent with every sign-in (the server needs it for new accounts).
export const consent = { confirm_18_plus: false, accept_terms: false, terms_version: '1' };

export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://example.com/terms';
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://example.com/privacy';

/** Friendly text for auth failures from the API. */
export function authErrorMessage(e: any): string {
  if (e?.code === 'banned') return e.message || 'This account is banned.';
  if (e?.code === 'consent_required') return 'Please confirm you are 18+ and accept the Terms.';
  return e?.message || 'Sign in failed. Try again.';
}
