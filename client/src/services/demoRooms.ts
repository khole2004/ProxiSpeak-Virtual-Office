/**
 * Demo room service (frontend-only milestone).
 *
 * IMPORTANT: rooms created here exist only in THIS browser's localStorage.
 * There is no server, so a code created on one computer cannot be found from
 * another. The UI says so; keep it that way until a real backend replaces this
 * module. The public functions are deliberately small so that swapping them
 * for API calls later does not require touching the screens.
 *
 * Room codes are stored in canonical form (six uppercase characters, no
 * hyphen, e.g. "K7MQ2X") and displayed as "K7M-Q2X".
 */
import { readJson, writeJson } from "./safeStorage";

export interface DemoRoom {
  /** Canonical code: exactly six characters, A-Z and 0-9, uppercase. */
  code: string;
  name: string;
  hostName: string;
  /** Milliseconds since the epoch; 0 for the built-in sample room. */
  createdAt: number;
}

export interface CreateRoomInput {
  displayName: string;
  roomName?: string;
}

export const ROOM_CODE_LENGTH = 6;
export const ROOM_NAME_MAX_LENGTH = 48;

const STORAGE_KEY = "proxispeak.demo.rooms.v1";
const MAX_STORED_ROOMS = 50;
/** Skips I, O, 0 and 1 so codes are easy to read aloud and retype. 32 symbols. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Always available, so "join a known room" can be tried on a fresh browser. */
export const SAMPLE_ROOM: DemoRoom = {
  code: "SAMPLE",
  name: "Sample studio",
  hostName: "ProxiSpeak",
  createdAt: 0,
};

/* ---------- Code helpers ---------- */

/** Uppercases and strips everything except letters and digits. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isRoomCodeFormat(code: string): boolean {
  return new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`).test(code);
}

/** "k7mq2x" -> "K7M-Q2X". Safe to call on partial input while typing. */
export function formatRoomCode(input: string): string {
  const code = normalizeRoomCode(input).slice(0, ROOM_CODE_LENGTH);
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

function generateRoomCode(taken: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const bytes = new Uint8Array(ROOM_CODE_LENGTH);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      bytes.forEach((_, index) => {
        bytes[index] = Math.floor(Math.random() * 256);
      });
    }
    // 256 is divisible by 32, so the modulo introduces no bias.
    const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find an unused room code.");
}

/* ---------- Name helpers ---------- */

export function cleanRoomName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, ROOM_NAME_MAX_LENGTH);
}

export function defaultRoomName(displayName: string): string {
  const host = displayName.trim();
  return host ? `${host}’s office` : "My office";
}

/* ---------- Storage ---------- */

function isDemoRoom(value: unknown): value is DemoRoom {
  if (typeof value !== "object" || value === null) return false;
  const room = value as Record<string, unknown>;
  return (
    typeof room.code === "string" &&
    isRoomCodeFormat(room.code) &&
    typeof room.name === "string" &&
    room.name.trim().length > 0 &&
    typeof room.hostName === "string" &&
    typeof room.createdAt === "number" &&
    Number.isFinite(room.createdAt)
  );
}

/** Malformed or missing data yields an empty list instead of an error. */
function readStoredRooms(): DemoRoom[] {
  const raw = readJson("local", STORAGE_KEY);
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>([SAMPLE_ROOM.code]);
  const rooms: DemoRoom[] = [];
  for (const item of raw) {
    if (isDemoRoom(item) && !seen.has(item.code)) {
      seen.add(item.code);
      rooms.push(item);
    }
  }
  return rooms;
}

/* ---------- Public API ---------- */

/** The sample room first, then rooms created in this browser, newest first. */
export function listRooms(): DemoRoom[] {
  const stored = readStoredRooms().sort((a, b) => b.createdAt - a.createdAt);
  return [SAMPLE_ROOM, ...stored];
}

/** Looks a room up by user-typed code in any casing or spacing. */
export function findRoom(input: string): DemoRoom | null {
  const code = normalizeRoomCode(input);
  if (!isRoomCodeFormat(code)) return null;
  return listRooms().find((room) => room.code === code) ?? null;
}

/** Creates and saves a room. Throws only if no free code can be generated. */
export function createRoom({ displayName, roomName = "" }: CreateRoomInput): DemoRoom {
  const stored = readStoredRooms();
  const taken = new Set([SAMPLE_ROOM.code, ...stored.map((room) => room.code)]);
  const host = displayName.trim();

  const room: DemoRoom = {
    code: generateRoomCode(taken),
    name: cleanRoomName(roomName) || defaultRoomName(host),
    hostName: host,
    createdAt: Date.now(),
  };

  writeJson("local", STORAGE_KEY, [...stored, room].slice(-MAX_STORED_ROOMS));
  return room;
}
