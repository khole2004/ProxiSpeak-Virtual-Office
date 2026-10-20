
import { readJson, writeJson } from "./safeStorage";

export interface DemoRoom {
 
  code: string;
  name: string;
  hostName: string;

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

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


export const SAMPLE_ROOM: DemoRoom = {
  code: "SAMPLE",
  name: "Sample studio",
  hostName: "ProxiSpeak",
  createdAt: 0,
};




export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isRoomCodeFormat(code: string): boolean {
  return new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`).test(code);
}


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



export function cleanRoomName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, ROOM_NAME_MAX_LENGTH);
}

export function defaultRoomName(displayName: string): string {
  const host = displayName.trim();
  return host ? `${host}’s office` : "My office";
}


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
