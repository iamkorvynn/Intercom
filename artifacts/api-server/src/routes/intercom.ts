import { Router } from "express";
import { AccessToken } from "livekit-server-sdk";

const router = Router();

interface DeviceRecord {
  lastSeen: number;
}

const devices = new Map<string, DeviceRecord>();

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
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit credentials not configured");
  }
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "24h",
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return token.toJwt();
}

/**
 * POST /api/intercom/session
 * Register device + pair with partner + get LiveKit token — all in one call.
 */
router.post("/intercom/session", async (req, res) => {
  const { myCode, partnerCode } = req.body as {
    myCode?: string;
    partnerCode?: string;
  };

  if (!myCode || !partnerCode) {
    res.status(400).json({ error: "myCode and partnerCode are required" });
    return;
  }

  devices.set(myCode, { lastSeen: Date.now() });

  const roomName = getRoomName(myCode, partnerCode);
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!livekitUrl) {
    res.status(503).json({ error: "LiveKit not configured on server" });
    return;
  }

  try {
    const token = await generateToken(roomName, myCode);
    res.json({ roomName, token, livekitUrl });
  } catch (err) {
    req.log.error(err, "Failed to generate LiveKit token");
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/**
 * POST /api/intercom/heartbeat
 * Keep-alive to track online presence.
 */
router.post("/intercom/heartbeat", (req, res) => {
  const { myCode } = req.body as { myCode?: string };
  if (myCode) {
    devices.set(myCode, { lastSeen: Date.now() });
  }
  res.json({ ok: true });
});

/**
 * GET /api/intercom/status?partnerCode=XXXXXX
 * Returns whether the partner was active in the last 30s.
 */
router.get("/intercom/status", (req, res) => {
  const { partnerCode } = req.query as { partnerCode?: string };
  if (!partnerCode) {
    res.status(400).json({ error: "partnerCode is required" });
    return;
  }
  const device = devices.get(partnerCode);
  const online = !!device && Date.now() - device.lastSeen < 30_000;
  res.json({ online });
});

export default router;
