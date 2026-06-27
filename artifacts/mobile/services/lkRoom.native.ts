/**
 * Native (iOS / Android) implementation of the LiveKit room primitives.
 * Registers the WebRTC globals required by @livekit/react-native before
 * anything else tries to import from the package.
 */
import { registerGlobals } from "@livekit/react-native";

registerGlobals();

export {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
} from "@livekit/react-native";
