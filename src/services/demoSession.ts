
import { isRoomCodeFormat } from "./demoRooms";
import { readJson, writeJson } from "./safeStorage";

export interface DemoSession {
  displayName: string;
  /** Canonical code of the selected room, or null before one is chosen. */
  roomCode: string | null;
}

export const DISPLAY_NAME_MAX_LENGTH = 32;

const SESSION_KEY = "proxispeak.demo.session.v1";

export type DisplayNameResult =
  | { valid: true; value: string }
  | { valid: false; message: string };

export function validateDisplayName(raw: string): DisplayNameResult {
  const value = raw.trim();
  if (!value) {
    return { valid: false, message: "Enter a display name to continue." };
  }
  if (value.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Use ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { valid: true, value };
}

export function readSession(): DemoSession {
  const raw = readJson("session", SESSION_KEY);
  const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const name = typeof data.displayName === "string" ? data.displayName.trim() : "";
  const code = typeof data.roomCode === "string" ? data.roomCode : "";

  return {
    displayName: name.length <= DISPLAY_NAME_MAX_LENGTH ? name : "",
    roomCode: isRoomCodeFormat(code) ? code : null,
  };
}

export function saveSession(patch: Partial<DemoSession>): DemoSession {
  const next = { ...readSession(), ...patch };
  writeJson("session", SESSION_KEY, next);
  return next;
}

export function clearRoomSelection(): void {
  saveSession({ roomCode: null });
}
