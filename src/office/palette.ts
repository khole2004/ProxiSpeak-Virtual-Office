import type { Accessory, AvatarLook, HairStyle } from "./types";

export const SKIN_TONES = ["#f7d9c0", "#efc19a", "#d9a074", "#a8704a", "#6f4630"];
export const HAIR_COLORS = ["#2a1d17", "#5a3a26", "#a2682f", "#d8b36a", "#b4482c", "#8d96a0"];
export const TOP_COLORS = ["#315f4a", "#e8c98a", "#c4764a", "#3f6a8f", "#8b5d8f", "#d95c5c", "#2e3532", "#efe7d4"];
export const BOTTOM_COLORS = ["#2e3a48", "#4a4036", "#3b5246", "#6b6f78"];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "short", label: "Short" },
  { id: "long", label: "Long" },
  { id: "bun", label: "Bun" },
  { id: "curly", label: "Curly" },
  { id: "spiky", label: "Spiky" },
  { id: "cap", label: "Cap" },
  { id: "bald", label: "None" },
];

export const ACCESSORIES: { id: Accessory; label: string }[] = [
  { id: "none", label: "None" },
  { id: "glasses", label: "Glasses" },
  { id: "headphones", label: "Headphones" },
];

export function defaultLook(): AvatarLook {
  return {
    skin: SKIN_TONES[1],
    hairStyle: "short",
    hairColor: HAIR_COLORS[1],
    top: TOP_COLORS[0],
    bottom: BOTTOM_COLORS[0],
    accessory: "none",
  };
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomLook(): AvatarLook {
  return {
    skin: pick(SKIN_TONES),
    hairStyle: pick(HAIR_STYLES).id,
    hairColor: pick(HAIR_COLORS),
    top: pick(TOP_COLORS),
    bottom: pick(BOTTOM_COLORS),
    accessory: pick(ACCESSORIES).id,
  };
}

export const EMOTES: { id: import("./types").EmoteKind; emoji: string; label: string }[] = [
  { id: "wave", emoji: "👋", label: "Wave" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "laugh", emoji: "😂", label: "Laugh" },
  { id: "thumbs", emoji: "👍", label: "Nice" },
  { id: "dance", emoji: "💃", label: "Dance" },
];
