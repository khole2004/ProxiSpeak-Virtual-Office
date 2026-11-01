import { defaultLook, SKIN_TONES } from "../office/palette";
import type { AvatarLook } from "../office/types";
import { readJson, writeJson } from "./safeStorage";

const KEY = "proxispeak.demo.look.v1";

/** The visitor's avatar, kept for this browser tab only. */
export function readLook(): AvatarLook {
  const raw = readJson("session", KEY);
  const base = defaultLook();
  if (typeof raw !== "object" || raw === null) return base;
  const d = raw as Record<string, unknown>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);
  const hair = ["short", "long", "bun", "curly", "spiky", "cap", "bald"];
  const acc = ["none", "glasses", "headphones"];
  return {
    skin: str(d.skin, SKIN_TONES[1]),
    hairStyle: hair.includes(d.hairStyle as string) ? (d.hairStyle as AvatarLook["hairStyle"]) : base.hairStyle,
    hairColor: str(d.hairColor, base.hairColor),
    top: str(d.top, base.top),
    bottom: str(d.bottom, base.bottom),
    accessory: acc.includes(d.accessory as string) ? (d.accessory as AvatarLook["accessory"]) : base.accessory,
  };
}

export function saveLook(look: AvatarLook): void {
  writeJson("session", KEY, look);
}
