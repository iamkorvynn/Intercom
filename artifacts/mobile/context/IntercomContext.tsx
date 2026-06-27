import AsyncStorage from "@react-native-async-storage/async-storage";
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
  startTransmitting: () => void;
  stopTransmitting: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
}

const STORAGE_KEYS = {
  MY_CODE: "@intercom/my_code",
  PARTNER: "@intercom/partner",
  SPEAKER: "@intercom/speaker",
  MUTED: "@intercom/muted",
};

function generateDeviceCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      // Simulate occasional poor network
      const roll = Math.random();
      if (roll < 0.02) {
        setConnectionState("poor");
        setTimeout(() => setConnectionState("connected"), 2000);
      }
    }, 15000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const simulateConnect = useCallback(() => {
    setConnectionState("connecting");
    connectTimerRef.current = setTimeout(() => {
      setConnectionState("connected");
      startHeartbeat();
    }, 1800);
  }, [startHeartbeat]);

  useEffect(() => {
    async function loadState() {
      try {
        let code = await AsyncStorage.getItem(STORAGE_KEYS.MY_CODE);
        if (!code) {
          code = generateDeviceCode();
          await AsyncStorage.setItem(STORAGE_KEYS.MY_CODE, code);
        }
        setMyCode(code);

        const partnerRaw = await AsyncStorage.getItem(STORAGE_KEYS.PARTNER);
        if (partnerRaw) {
          const savedPartner: Partner = JSON.parse(partnerRaw);
          setPartner(savedPartner);
          simulateConnect();
        }

        const speakerRaw = await AsyncStorage.getItem(STORAGE_KEYS.SPEAKER);
        if (speakerRaw !== null) setIsSpeakerOn(speakerRaw === "true");

        const mutedRaw = await AsyncStorage.getItem(STORAGE_KEYS.MUTED);
        if (mutedRaw !== null) setIsMuted(mutedRaw === "true");
      } catch {
        // Use defaults on error
      } finally {
        setIsLoading(false);
      }
    }
    loadState();

    return () => {
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      stopHeartbeat();
    };
  }, [simulateConnect, stopHeartbeat]);

  const pair = useCallback(
    async (code: string, name: string) => {
      const newPartner: Partner = { code, name };
      setPartner(newPartner);
      await AsyncStorage.setItem(
        STORAGE_KEYS.PARTNER,
        JSON.stringify(newPartner)
      );
      simulateConnect();
    },
    [simulateConnect]
  );

  const unpair = useCallback(async () => {
    setPartner(null);
    setConnectionState("disconnected");
    setIsTransmitting(false);
    setPartnerTransmitting(false);
    stopHeartbeat();
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    await AsyncStorage.removeItem(STORAGE_KEYS.PARTNER);
  }, [stopHeartbeat]);

  const startTransmitting = useCallback(() => {
    if (isMuted || connectionState !== "connected") return;
    setIsTransmitting(true);
  }, [isMuted, connectionState]);

  const stopTransmitting = useCallback(() => {
    setIsTransmitting(false);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.MUTED, String(next));
      return next;
    });
  }, []);

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
