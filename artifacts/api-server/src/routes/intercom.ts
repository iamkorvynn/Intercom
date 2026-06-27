import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

interface DeviceRecord {
  lastSeen: number;
  pushToken?: string;
}

const devices = new Map<string, DeviceRecord>();

const ONLINE_THRESHOLD_MS = 15_000;

function getRoomName(codeA: string, codeB: string): string {
  const [a, b] = [codeA, codeB].sort();
  return `intercom-${a}-${b}`;
}

async function generateToken(
  roomName: string,
  identity: string
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("LiveKit credentials not configured");
  const token = new AccessToken(apiKey, apiSecret, { identity, ttl: "24h" });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}

async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
      priority: "high",
      channelId: "intercom",
    }),
  });
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * POST /api/intercom/session
 * Register + pair + get LiveKit token in one call.
 * Body: { myCode, partnerCode, pushToken? }
 */
router.post("/intercom/session", async (req, res) => {
  const { myCode, partnerCode, pushToken } = req.body as {
    myCode?: string;
    partnerCode?: string;
    pushToken?: string;
  };

  if (!myCode || !partnerCode) {
    res.status(400).json({ error: "myCode and partnerCode are required" });
    return;
  }

  devices.set(myCode, {
    lastSeen: Date.now(),
    pushToken: pushToken ?? devices.get(myCode)?.pushToken,
  });

  const livekitUrl = process.env.LIVEKIT_URL;
  if (!livekitUrl) {
    res.status(503).json({ error: "LiveKit not configured on server" });
    return;
  }

  const roomName = getRoomName(myCode, partnerCode);

  try {
    const token = await generateToken(roomName, myCode);
    res.json({ roomName, token, livekitUrl });
  } catch (err) {
    req.log.error(err, "Failed to generate LiveKit token");
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/**
 * POST /api/intercom/transmit
 * Called when a user presses PTT. Sends a push notification to the partner
 * if they are offline (no heartbeat in the last ONLINE_THRESHOLD_MS).
 * Body: { myCode, partnerCode, senderName? }
 */
router.post("/intercom/transmit", async (req, res) => {
  const { myCode, partnerCode, senderName } = req.body as {
    myCode?: string;
    partnerCode?: string;
    senderName?: string;
  };

  if (!myCode || !partnerCode) {
    res.status(400).json({ error: "myCode and partnerCode are required" });
    return;
  }

  // Keep sender's presence alive
  const senderRecord = devices.get(myCode) ?? { lastSeen: 0 };
  devices.set(myCode, { ...senderRecord, lastSeen: Date.now() });

  const partner = devices.get(partnerCode);
  if (!partner) {
    res.json({ notified: false, reason: "partner-not-registered" });
    return;
  }

  const isOnline = Date.now() - partner.lastSeen < ONLINE_THRESHOLD_MS;
  if (isOnline) {
    res.json({ notified: false, reason: "online" });
    return;
  }
  if (!partner.pushToken) {
    res.json({ notified: false, reason: "no-token" });
    return;
  }

  try {
    await sendExpoPush(
      partner.pushToken,
      "📡 Incoming Transmission",
      senderName
        ? `${senderName} is trying to reach you`
        : "Someone is trying to reach you — open Intercom",
      { type: "intercom-ptt", from: myCode, senderName: senderName ?? "" }
    );
    res.json({ notified: true });
  } catch (err) {
    req.log.error(err, "Failed to send push notification");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

/**
 * POST /api/intercom/heartbeat
 * Body: { myCode }
 */
router.post("/intercom/heartbeat", (req, res) => {
  const { myCode } = req.body as { myCode?: string };
  if (myCode) {
    const existing = devices.get(myCode) ?? { lastSeen: 0 };
    devices.set(myCode, { ...existing, lastSeen: Date.now() });
  }
  res.json({ ok: true });
});

/**
 * GET /api/intercom/status?partnerCode=XXXXXX
 */
router.get("/intercom/status", (req, res) => {
  const { partnerCode } = req.query as { partnerCode?: string };
  if (!partnerCode) {
    res.status(400).json({ error: "partnerCode is required" });
    return;
  }
  const device = devices.get(partnerCode);
  const online = !!device && Date.now() - device.lastSeen < ONLINE_THRESHOLD_MS;
  res.json({ online });
});

export default router;
