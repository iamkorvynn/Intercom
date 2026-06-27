import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ConnectionState as LKConnectionState,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  SPEAKER: "@intercom/speaker",
  MUTED: "@intercom/muted",
};

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

function generateDeviceCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function fetchSession(
  myCode: string,
  partnerCode: string
): Promise<LiveKitSession> {
  const res = await fetch(`${API_BASE}/intercom/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ myCode, partnerCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Session failed");
  }
  return res.json() as Promise<LiveKitSession>;
}

async function sendHeartbeat(myCode: string) {
  await fetch(`${API_BASE}/intercom/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ myCode }),
  });
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

  // ── LiveKit room setup ──────────────────────────────────────────────────────

  const teardownRoom = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
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

      room.on(LKConnectionState.Connected, () => {
        setConnectionState("connected");
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnectionState("disconnected");
      });
      room.on(RoomEvent.Reconnecting, () => {
        setConnectionState("connecting");
      });
      room.on(RoomEvent.Reconnected, () => {
        setConnectionState("connected");
      });
      room.on(RoomEvent.ConnectionQualityChanged, (_quality, participant) => {
        if (!participant) return;
        // Only show "poor" for local participant
        if (participant.isLocal) {
          if (_quality === "poor") {
            setConnectionState("poor");
          } else if (connectionState === "poor") {
            setConnectionState("connected");
          }
        }
      });

      // Partner PTT detection: track published = transmitting, unpublished = idle
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

      // Start heartbeat loop
      heartbeatRef.current = setInterval(async () => {
        try {
          await sendHeartbeat(myCodeRef.current);
        } catch {
          /* ignore */
        }
      }, 15_000);
    },
    [teardownRoom]
  );

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        let code = await AsyncStorage.getItem(STORAGE_KEYS.MY_CODE);
        if (!code) {
          code = generateDeviceCode();
          await AsyncStorage.setItem(STORAGE_KEYS.MY_CODE, code);
        }
        setMyCode(code);
        myCodeRef.current = code;

        const partnerRaw = await AsyncStorage.getItem(STORAGE_KEYS.PARTNER);
        const sessionRaw = await AsyncStorage.getItem(STORAGE_KEYS.LK_SESSION);

        if (partnerRaw && sessionRaw) {
          const savedPartner: Partner = JSON.parse(partnerRaw);
          const savedSession: LiveKitSession = JSON.parse(sessionRaw);
          setPartner(savedPartner);
          // Reconnect with saved token (it lasts 24h)
          connectRoom(savedSession).catch(() => {
            // Token may have expired — will need to re-pair
            setConnectionState("disconnected");
          });
        }

        const speakerRaw = await AsyncStorage.getItem(STORAGE_KEYS.SPEAKER);
        if (speakerRaw !== null) setIsSpeakerOn(speakerRaw === "true");
        const mutedRaw = await AsyncStorage.getItem(STORAGE_KEYS.MUTED);
        if (mutedRaw !== null) setIsMuted(mutedRaw === "true");
      } catch {
        /* use defaults */
      } finally {
        setIsLoading(false);
      }
    }
    init();

    return () => teardownRoom();
  }, []);

  // ── Pairing ─────────────────────────────────────────────────────────────────

  const pair = useCallback(
    async (code: string, name: string) => {
      const session = await fetchSession(myCodeRef.current, code);
      const newPartner: Partner = { code, name };
      setPartner(newPartner);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PARTNER,
        JSON.stringify(newPartner)
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.LK_SESSION,
        JSON.stringify(session)
      );
      await connectRoom(session);
    },
    [connectRoom]
  );

  const unpair = useCallback(async () => {
    teardownRoom();
    setPartner(null);
    setConnectionState("disconnected");
    setIsTransmitting(false);
    setPartnerTransmitting(false);
    await AsyncStorage.multiRemove([STORAGE_KEYS.PARTNER, STORAGE_KEYS.LK_SESSION]);
  }, [teardownRoom]);

  // ── PTT ─────────────────────────────────────────────────────────────────────

  const startTransmitting = useCallback(async () => {
    if (isMuted || connectionState !== "connected" || !roomRef.current) return;
    setIsTransmitting(true);
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(true);
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
      if (next && isTransmitting) {
        stopTransmitting();
      }
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
