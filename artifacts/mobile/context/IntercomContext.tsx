import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  ConnectionState as LKConnectionState,
  Room,
  RoomEvent,
  Track,
} from "@/services/lkRoom";
import { registerForPushNotifications } from "@/services/notifications";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "offline"
  | "poor";

export interface Partner {
  code: string;
  name: string;
}

interface LiveKitSession {
  token: string;
  livekitUrl: string;
  roomName: string;
}

interface IntercomContextType {
  myCode: string;
  partner: Partner | null;
  connectionState: ConnectionState;
  isTransmitting: boolean;
  partnerTransmitting: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isLoading: boolean;
  pair: (code: string, name: string) => Promise<void>;
  unpair: () => Promise<void>;
  startTransmitting: () => Promise<void>;
  stopTransmitting: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

const STORAGE_KEYS = {
  MY_CODE: "@intercom/my_code",
  PARTNER: "@intercom/partner",
  LK_SESSION: "@intercom/lk_session",
  PUSH_TOKEN: "@intercom/push_token",
  SPEAKER: "@intercom/speaker",
  MUTED: "@intercom/muted",
};

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

function generateDeviceCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Access",
        message: "Intercom needs microphone access for push-to-talk.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

async function fetchSession(
  myCode: string,
  partnerCode: string,
  pushToken: string | null
): Promise<LiveKitSession> {
  const res = await fetch(`${API_BASE}/intercom/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ myCode, partnerCode, pushToken }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Session request failed");
  }
  return res.json() as Promise<LiveKitSession>;
}

async function notifyTransmit(
  myCode: string,
  partnerCode: string,
  senderName: string
): Promise<void> {
  await fetch(`${API_BASE}/intercom/transmit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ myCode, partnerCode, senderName }),
  });
}

async function sendHeartbeat(myCode: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/intercom/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ myCode }),
    });
  } catch {
    /* ignore */
  }
}

const IntercomContext = createContext<IntercomContextType | null>(null);

export function IntercomProvider({ children }: { children: React.ReactNode }) {
  const [myCode, setMyCode] = useState<string>("");
  const [partner, setPartner] = useState<Partner | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [partnerTransmitting, setPartnerTransmitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const roomRef = useRef<Room | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const myCodeRef = useRef<string>("");
  const partnerRef = useRef<Partner | null>(null);
  const pushTokenRef = useRef<string | null>(null);

  // ── Room lifecycle ──────────────────────────────────────────────────────────

  const teardownRoom = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
  }, []);

  const connectRoom = useCallback(
    async (session: LiveKitSession) => {
      teardownRoom();
      setConnectionState("connecting");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: LKConnectionState) => {
        if (state === LKConnectionState.Connected) {
          setConnectionState("connected");
        } else if (state === LKConnectionState.Disconnected) {
          setConnectionState("disconnected");
        } else if (state === LKConnectionState.Reconnecting) {
          setConnectionState("connecting");
        }
      });

      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        if (!participant.isLocal && publication.kind === Track.Kind.Audio) {
          setPartnerTransmitting(true);
        }
      });
      room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
        if (!participant.isLocal && publication.kind === Track.Kind.Audio) {
          setPartnerTransmitting(false);
        }
      });
      room.on(RoomEvent.TrackMuted, (publication, participant) => {
        if (!participant.isLocal && publication.kind === Track.Kind.Audio) {
          setPartnerTransmitting(false);
        }
      });
      room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
        if (!participant.isLocal && publication.kind === Track.Kind.Audio) {
          setPartnerTransmitting(true);
        }
      });

      await room.connect(session.livekitUrl, session.token);
      roomRef.current = room;

      heartbeatRef.current = setInterval(
        () => sendHeartbeat(myCodeRef.current),
        15_000
      );
    },
    [teardownRoom]
  );

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        // Device code
        let code = await AsyncStorage.getItem(STORAGE_KEYS.MY_CODE);
        if (!code) {
          code = generateDeviceCode();
          await AsyncStorage.setItem(STORAGE_KEYS.MY_CODE, code);
        }
        setMyCode(code);
        myCodeRef.current = code;

        // Load persisted state
        const keys = [
          STORAGE_KEYS.PARTNER,
          STORAGE_KEYS.LK_SESSION,
          STORAGE_KEYS.PUSH_TOKEN,
          STORAGE_KEYS.SPEAKER,
          STORAGE_KEYS.MUTED,
        ];
        const pairs = await AsyncStorage.multiGet(keys);
        const stored = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

        if (stored[STORAGE_KEYS.SPEAKER] != null)
          setIsSpeakerOn(stored[STORAGE_KEYS.SPEAKER] === "true");
        if (stored[STORAGE_KEYS.MUTED] != null)
          setIsMuted(stored[STORAGE_KEYS.MUTED] === "true");

        // Push token
        const savedPushToken = stored[STORAGE_KEYS.PUSH_TOKEN];
        if (savedPushToken) pushTokenRef.current = savedPushToken;

        // Restore partner + LiveKit session
        const partnerStr = stored[STORAGE_KEYS.PARTNER];
        if (partnerStr) {
          const p: Partner = JSON.parse(partnerStr);
          setPartner(p);
          partnerRef.current = p;
        }
        const sessionStr = stored[STORAGE_KEYS.LK_SESSION];
        if (partnerStr && sessionStr) {
          const session: LiveKitSession = JSON.parse(sessionStr);
          connectRoom(session).catch(() => setConnectionState("disconnected"));
        }

        // Register for push notifications (no-op on web)
        registerForPushNotifications()
          .then(async (token) => {
            if (token && token !== savedPushToken) {
              pushTokenRef.current = token;
              await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
            }
          })
          .catch(() => {});
      } catch {
        /* use defaults */
      } finally {
        setIsLoading(false);
      }
    }
    init();
    return () => teardownRoom();
  }, [connectRoom, teardownRoom]);

  // ── Pairing ─────────────────────────────────────────────────────────────────

  const pair = useCallback(
    async (code: string, name: string) => {
      const session = await fetchSession(
        myCodeRef.current,
        code,
        pushTokenRef.current
      );
      const newPartner: Partner = { code, name };
      setPartner(newPartner);
      partnerRef.current = newPartner;
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.PARTNER, JSON.stringify(newPartner)],
        [STORAGE_KEYS.LK_SESSION, JSON.stringify(session)],
      ]);
      await connectRoom(session);
    },
    [connectRoom]
  );

  const unpair = useCallback(async () => {
    teardownRoom();
    setPartner(null);
    partnerRef.current = null;
    setConnectionState("disconnected");
    setIsTransmitting(false);
    setPartnerTransmitting(false);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PARTNER,
      STORAGE_KEYS.LK_SESSION,
    ]);
  }, [teardownRoom]);

  // ── PTT ─────────────────────────────────────────────────────────────────────

  const startTransmitting = useCallback(async () => {
    if (isMuted || connectionState !== "connected" || !roomRef.current) return;
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;
    setIsTransmitting(true);
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(true);
      // Fire-and-forget: notify partner if they're offline
      if (partnerRef.current) {
        notifyTransmit(
          myCodeRef.current,
          partnerRef.current.code,
          partnerRef.current.name
        ).catch(() => {});
      }
    } catch {
      setIsTransmitting(false);
    }
  }, [isMuted, connectionState]);

  const stopTransmitting = useCallback(async () => {
    setIsTransmitting(false);
    try {
      await roomRef.current?.localParticipant.setMicrophoneEnabled(false);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && isTransmitting) stopTransmitting();
      AsyncStorage.setItem(STORAGE_KEYS.MUTED, String(next));
      return next;
    });
  }, [isTransmitting, stopTransmitting]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.SPEAKER, String(next));
      return next;
    });
  }, []);

  return (
    <IntercomContext.Provider
      value={{
        myCode,
        partner,
        connectionState,
        isTransmitting,
        partnerTransmitting,
        isMuted,
        isSpeakerOn,
        isLoading,
        pair,
        unpair,
        startTransmitting,
        stopTransmitting,
        toggleMute,
        toggleSpeaker,
      }}
    >
      {children}
    </IntercomContext.Provider>
  );
}

export function useIntercom(): IntercomContextType {
  const ctx = useContext(IntercomContext);
  if (!ctx) throw new Error("useIntercom must be used within IntercomProvider");
  return ctx;
}
