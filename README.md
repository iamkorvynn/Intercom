# Intercom

A movie-style, always-connected push-to-talk mobile app. Pair with one person and press to talk — instantly, with no calls and no waiting. Real audio over LiveKit. Push notifications when your partner transmits while you're offline.

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | Expo / React Native (SDK 54) |
| Audio | LiveKit (`livekit-client` on web, `@livekit/react-native` on device) |
| Backend | Express 5 + Node.js 24 |
| Push notifications | Expo Push Notification service |
| Local storage | AsyncStorage |
| UI | Dark cinematic — `#060606` background, `#00FF41` green, Inter font |

---

## Project structure

```
artifacts/
  mobile/               # Expo app
    app/
      index.tsx         # Pairing / home screen
      pair.tsx          # Enter partner code
      main.tsx          # PTT screen (waveform, controls)
      history.tsx       # Missed transmissions log
      settings.tsx      # Unpair + preferences
      _layout.tsx       # Root layout + notification listeners
    context/
      IntercomContext.tsx   # LiveKit room, pairing, PTT state
    services/
      lkRoom.ts             # LiveKit export (web)
      lkRoom.native.ts      # LiveKit export (native, registerGlobals)
      notifications.ts      # Expo push token registration + handlers
      transmissionLog.ts    # AsyncStorage CRUD for missed transmissions
    components/
      PushToTalkButton.tsx
      WaveformVisualizer.tsx
      PartnerDisplay.tsx
      SignalIndicator.tsx
      ErrorBoundary.tsx

  api-server/           # Express API
    src/
      routes/
        intercom.ts     # All intercom endpoints
      index.ts          # Server entry
```

---

## How it works

### Pairing
Each device generates a random 6-digit code on first launch (stored in AsyncStorage). To connect two devices, User A shares their code with User B, who enters it in the "Pair" screen. Both devices call `POST /api/intercom/session`, which:
1. Stores each device's push token
2. Generates a LiveKit room name (deterministic from both codes)
3. Returns a signed LiveKit JWT

### Push-to-talk
The PTT button enables/disables the local microphone track in the LiveKit room. The partner's audio plays automatically via subscribed tracks. No separate call setup — the room is always joined.

### Push notifications
When PTT is pressed, the mobile app also calls `POST /api/intercom/transmit`. The backend checks if the partner's last heartbeat was more than 15 seconds ago. If so, it sends an Expo push notification to their device token via `https://exp.host/--/api/v2/push/send`.

### Missed transmissions log
Every incoming push notification of type `intercom-ptt` is recorded in AsyncStorage. The History screen (`/history`) shows these grouped by day with relative timestamps. A badge on the LOG button counts unread entries.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/intercom/session` | Register device + get LiveKit token |
| `POST` | `/api/intercom/transmit` | Notify partner if offline |
| `POST` | `/api/intercom/heartbeat` | Update presence timestamp |
| `GET` | `/api/intercom/status` | Check if partner is online |

### `POST /api/intercom/session`
```json
// Request
{ "myCode": "123456", "partnerCode": "654321", "pushToken": "ExponentPushToken[...]" }

// Response
{ "roomName": "intercom-123456-654321", "token": "<livekit-jwt>", "livekitUrl": "wss://..." }
```

### `POST /api/intercom/transmit`
```json
// Request
{ "myCode": "123456", "partnerCode": "654321", "senderName": "Alex" }

// Response
{ "notified": true }
// or
{ "notified": false, "reason": "online" | "no-token" | "partner-not-registered" }
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `LIVEKIT_URL` | Yes | LiveKit server URL, e.g. `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` | Yes | LiveKit project API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit project API secret |
| `SESSION_SECRET` | Yes | Express session secret |
| `EXPO_PUBLIC_DOMAIN` | Mobile | Base domain of your backend API — wires up the API base URL in the app |

Get LiveKit credentials free at [livekit.io](https://livekit.io). Add them in the **Secrets** tab.

---

## Running locally

```bash
# API server (port 8080, proxied to /api)
pnpm --filter @workspace/api-server run dev

# Expo app (web preview)
pnpm --filter @workspace/mobile run dev
```

### Native audio (physical device required)
Expo Go does not support WebRTC. To test real audio you need a development build:

```bash
# Android
cd artifacts/mobile && npx expo run:android

# iOS
cd artifacts/mobile && npx expo run:ios
```

---

## Notable implementation details

- **Platform-split LiveKit**: `lkRoom.ts` (web) and `lkRoom.native.ts` (native) are resolved automatically by Metro's platform extension resolution. Never import from both directly.
- **`@livekit/react-native-webrtc` has no `app.plugin.js`** — do not add it to the `app.json` plugins array. Mic permissions are declared directly in `ios.infoPlist` and `android.permissions`.
- **Metro blockList**: `metro.config.js` blocks `_tmp_NNNN` directories to prevent a FallbackWatcher ENOENT crash that occurs after certain `pnpm add` postinstall runs.
- **No database**: the backend uses an in-memory `Map` for device records. Restarting the server clears all pairing state. For production, replace with a persistent store (Redis, Postgres, etc.).
- **Notification deduplication**: entries are keyed by Expo notification identifier, so tapping a notification that also arrived while the app was foregrounded won't create two log entries.
