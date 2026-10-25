export type HairStyle = "short" | "long" | "bun" | "curly" | "spiky" | "cap" | "bald";
export type Accessory = "none" | "glasses" | "headphones";
export type EmoteKind = "wave" | "clap" | "heart" | "laugh" | "thumbs" | "dance";

export interface AvatarLook {
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  top: string;
  bottom: string;
  accessory: Accessory;
}

export interface PersonSnapshot {
  id: string;
  name: string;
  isSelf: boolean;
  look: AvatarLook;
  muted: boolean;
  speaking: boolean;
  /** Metres from you. 0 for yourself. */
  distance: number;
  /** 0 (silent) to 1 (full volume): what you would hear. */
  volume: number;
  zoneId: string;
  zoneName: string;
}

export interface OfficeSnapshot {
  people: PersonSnapshot[];
  zoneId: string;
  zoneName: string;
  zonePrivate: boolean;
}

export type OfficeEvent =
  | { type: "zone"; zoneId: string; zoneName: string; zonePrivate: boolean }
  | { type: "near"; name: string }
  | { type: "wave"; name: string };

export interface ZoneDef {
  id: string;
  name: string;
  /** Centre and size on the floor (metres). */
  x: number;
  z: number;
  w: number;
  d: number;
  private: boolean;
  color: string;
}
