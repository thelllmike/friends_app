# Friends — mobile app (React Native + Expo)

The Android / iOS app for the self-hosted Friends backend in the folder above.
It talks only to your own server: REST for accounts, WebSocket `/ws` for matching and chat,
peer-to-peer WebRTC for video (relayed through your coturn when needed). No Supabase/Firebase/Agora/Twilio.

## Run it locally

```bash
# 1. backend (from the repo root): API on :8000 with Postgres + Redis
# 2. app
cd mobile
npm install
cp .env.example .env          # set EXPO_PUBLIC_API_URL if the API isn't on this machine
npx expo start --web          # quick UI check in the browser (camera works in Chrome)
npx expo run:ios              # iOS simulator dev build (needs Xcode)
npx expo run:android          # Android emulator/device dev build (needs Android Studio)
```

This app uses native modules (WebRTC, Google Sign-In, in-app purchases), so **Expo Go won't work** —
use `expo run:*` or an EAS dev build. The simulator has no real camera; test calls on real phones
or between the web build and a phone.

API URL defaults when `EXPO_PUBLIC_API_URL` is unset: Android emulator `http://10.0.2.2:8000`,
iOS simulator `http://127.0.0.1:8000`. On a real phone set it to your LAN IP or your domain
(`https://api.yourdomain.com`). Production must be HTTPS/WSS.

## Environment variables (`.env`)

| Variable | What |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL, e.g. `https://api.yourdomain.com` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth **Web** client ID (the backend verifies its ID tokens). Leave empty to hide Google sign-in |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS client ID |
| `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` | Your legal pages |

Put the same client IDs in the backend's `GOOGLE_CLIENT_IDS`, and your iOS bundle ID in `APPLE_AUDIENCES`.

## Before publishing

1. **IDs:** change `com.example.friends` in `app.json` (iOS `bundleIdentifier`, Android `package`) to your own.
2. **Google Sign-In:** create Android (with your SHA-1), iOS and Web OAuth clients in Google Cloud;
   set the iOS URL scheme (reversed iOS client ID) in the google-signin plugin options in `app.json`.
3. **Apple Sign-In:** enable the capability for your App ID (required on iOS if you offer Google).
4. **Subscriptions:** create products in App Store Connect / Play Console whose IDs match
   `apple_product_id` / `google_product_id` of your plans (Admin dashboard → Settings → Plans).
   Configure the backend store keys so `/premium/verify/*` can verify receipts.
5. **Builds:** `npx eas build -p android` / `-p ios` (or `expo prebuild` + Xcode/Gradle).
   Don't hand-edit `ios/` or `android/`; they're generated from `app.json`.

## Layout

```
src/app/            screens (expo-router): onboarding, login, phone, profile-setup,
                    (tabs)/home|chats|profile, call, premium, edit-profile,
                    linked-accounts, blocked, safety-tips, language, privacy
src/call/           useCall (matching/WebRTC state machine), rtc (native) / rtc.web
src/components/     UI kit (design tokens from the Friends design), sheets, report, toast
src/lib/            api client + token refresh, auth, match prefs, sign-in, purchases
```

Checks: `npx tsc --noEmit` and `npx expo lint`.

**Xcode version:** Expo SDK 58 expects Xcode 26.4+. To also build with Xcode 26.2, `patches/` holds a
one-line fix for `expo-modules-jsi` that `patch-package` applies automatically after `npm install`.
Remove it once you're on Xcode 26.4 or a newer Expo patch release.

Notes: chat messages are not stored anywhere (the Chats tab is a list of recent people kept on the
phone only). Premium is bought only in the native apps; the web build shows plans read-only.

## Calls in the background

Switching to another app doesn't end a call. `modules/call-service` is a small local Expo module: on
Android it runs a foreground service (type camera|microphone) with an ongoing "Video chat in progress"
notification while the call screen is open, so camera, mic and the connection keep working. iOS keeps
the audio running via the `audio` background mode (iOS pauses the camera in the background). On the
web, hidden tabs keep running.
