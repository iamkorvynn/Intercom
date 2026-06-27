---
name: LiveKit React Native + Expo setup
description: How to correctly wire up @livekit/react-native for native audio + livekit-client for web in the Expo monorepo.
---

## The rule
`@livekit/react-native-webrtc` does NOT have an `app.plugin.js` Expo config plugin. Adding it to `app.json` plugins crashes with "Unable to resolve a valid config plugin".

**How to apply:**
- Remove `@livekit/react-native-webrtc` from the `plugins` array in `app.json`.
- Microphone permissions go directly in `app.json`:
  - iOS: `expo.ios.infoPlist.NSMicrophoneUsageDescription`
  - Android: `expo.android.permissions` array (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, BLUETOOTH, BLUETOOTH_CONNECT)
- For platform-specific LiveKit imports, use Metro's platform file resolution:
  - `services/lkRoom.ts` → exports from `livekit-client` (web)
  - `services/lkRoom.native.ts` → calls `registerGlobals()` then exports from `@livekit/react-native` (native)
- `expo-dev-client` IS a valid plugin and should remain in the plugins array.

**Why:** expo-dev-client plugin configures the dev client launcher. @livekit/react-native-webrtc only needs to be listed as a dependency — its native code is linked automatically via autolinking during the native build (expo run:android / EAS Build).
