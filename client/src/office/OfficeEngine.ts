import * as THREE from "three";
import { Avatar } from "./avatar";
import { moveWithCollision, NavGrid } from "./nav";
import { EMOTES } from "./palette";
import { proximityTexture, rippleTexture } from "./textures";
import type { AvatarLook, EmoteKind, OfficeEvent, OfficeSnapshot, PersonSnapshot, ZoneDef } from "./types";
import { buildWorld, type World } from "./world";

/** Voice falls off between these distances (metres). */
export const INNER_RADIUS = 2.2;
export const OUTER_RADIUS = 6.5;

export function volumeAt(distance: number): number {
  if (distance <= INNER_RADIUS) return 1;
  if (distance >= OUTER_RADIUS) return 0;
  const t = (distance - INNER_RADIUS) / (OUTER_RADIUS - INNER_RADIUS);
  return Math.pow(1 - t, 1.6);
}

export type EngineMode = "creator" | "play";

export interface EngineOptions {
  name: string;
  look: AvatarLook;
  onSnapshot: (s: OfficeSnapshot) => void;
  onEvent: (e: OfficeEvent) => void;
}

const MIC_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3M2 2l20 20"/></svg>';

interface Tag {
  el: HTMLDivElement;
  pill: HTMLDivElement;
  bubble: HTMLDivElement;
  bars: HTMLSpanElement;
  mic: HTMLSpanElement;
  last: { speaking: boolean; muted: boolean; level: number; far: boolean; bubble: string };
  x: number;
  y: number;
}

interface BotBrain {
  group: string;
  leader: boolean;
  waitUntil: number;
  nextSpeakAt: number;
  speakUntil: number;
  greetedAt: number;
  zones: (keyof World["pois"])[];
  nearSince: number;
}

interface Entity {
  id: string;
  name: string;
  isSelf: boolean;
  avatar: Avatar;
  x: number;
  z: number;
  yaw: number;
  moveSpeed: number;
  path: [number, number][];
  muted: boolean;
  speaking: boolean;
  emote: EmoteKind | null;
  emoteStart: number;
  emoteUntil: number;
  zoneId: string;
  tag: Tag;
  ripple: THREE.Mesh;
  rippleMat: THREE.MeshBasicMaterial;
  brain?: BotBrain;
  wasAudible: boolean;
  lastNearEvent: number;
}

const EMOTE_LENGTH: Record<EmoteKind, number> = { wave: 2.4, clap: 2.4, heart: 2.6, laugh: 2.2, thumbs: 2, dance: 4.2 };

const BOTS: { id: string; name: string; look: AvatarLook; muted: boolean; start: [number, number]; group: string; leader: boolean; zones: (keyof World["pois"])[] }[] = [
  {
    id: "meera", name: "Meera", muted: false, start: [-2.6, 1.4], group: "a", leader: true, zones: ["commons", "lounge", "commons", "cafe"],
    look: { skin: "#d9a074", hairStyle: "long", hairColor: "#2a1d17", top: "#e8c98a", bottom: "#2e3a48", accessory: "none" },
  },
  {
    id: "rohan", name: "Rohan", muted: false, start: [-1.4, 1.0], group: "a", leader: false, zones: ["commons"],
    look: { skin: "#a8704a", hairStyle: "short", hairColor: "#2a1d17", top: "#3f6a8f", bottom: "#4a4036", accessory: "glasses" },
  },
  {
    id: "ishita", name: "Ishita", muted: false, start: [11.0, 5.8], group: "b", leader: true, zones: ["cafe", "commons", "cafe", "lounge"],
    look: { skin: "#efc19a", hairStyle: "bun", hairColor: "#5a3a26", top: "#c4764a", bottom: "#3b5246", accessory: "none" },
  },
  {
    id: "kabir", name: "Kabir", muted: true, start: [12.2, 5.7], group: "b", leader: false, zones: ["cafe"],
    look: { skin: "#d9a074", hairStyle: "curly", hairColor: "#2a1d17", top: "#efe7d4", bottom: "#2e3a48", accessory: "headphones" },
  },
  {
    id: "aarav", name: "Aarav", muted: false, start: [-12.4, -4.6], group: "c", leader: true, zones: ["meeting", "meeting", "desks"],
    look: { skin: "#f7d9c0", hairStyle: "spiky", hairColor: "#b4482c", top: "#8b5d8f", bottom: "#4a4036", accessory: "none" },
  },
  {
    id: "sana", name: "Sana", muted: true, start: [10.8, -7.4], group: "d", leader: true, zones: ["desks", "desks", "cafe", "lounge"],
    look: { skin: "#6f4630", hairStyle: "cap", hairColor: "#2a1d17", top: "#315f4a", bottom: "#6b6f78", accessory: "headphones" },
  },
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export class OfficeEngine {
  static async create(host: HTMLElement, options: EngineOptions): Promise<OfficeEngine> {
    // Floor lettering and the wall sign use the web font.
    try {
      await Promise.race([
        Promise.all([document.fonts.load('800 64px "Manrope"'), document.fonts.load('600 40px "DM Sans"')]),
        new Promise((r) => setTimeout(r, 900)),
      ]);
    } catch {
      /* fall back to system fonts */
    }
    return new OfficeEngine(host, options);
  }

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.5, 120);
  private readonly world: World;
  private readonly nav: NavGrid;
  private readonly overlay: HTMLDivElement;
  private readonly entities: Entity[] = [];
  private readonly self: Entity;
  private readonly keys = new Set<string>();
  private readonly ring: THREE.Mesh;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly podium: THREE.Group;
  private readonly marker: THREE.Mesh;
  private readonly markerMat: THREE.MeshBasicMaterial;
  private readonly resizeObserver: ResizeObserver;
  private readonly rippleTex: THREE.Texture;

  private raf = 0;
  private last = performance.now();
  private clock = 0;
  private snapTimer = 0;
  private mapTimer = 0;
  private markerT = 1;
  private disposed = false;

  private mode: EngineMode = "creator";
  private zoom = 1;
  private previewYaw = 0.35;
  private creatorShift = 0;
  private creatorShiftY = 0;
  private viewShiftY = 0;
  private selfSpeaking = false;
  private deafened = false;
  private width = 1;
  private height = 1;
  private minimap: HTMLCanvasElement | null = null;
  private selfZoneId = "";

  private camTarget = new THREE.Vector3();
  private camOffset = new THREE.Vector3(0, 0.5, 5.7);
  private viewShift = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private pointer = { down: false, x: 0, y: 0, moved: 0, t: 0 };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
      this.keys.add(k);
      if (k.startsWith("arrow")) e.preventDefault();
    }
  };
  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private readonly onBlur = () => this.keys.clear();

  constructor(private readonly host: HTMLElement, private readonly opts: EngineOptions) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // static furniture only: baked once
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.className = "office-canvas";
    host.appendChild(this.renderer.domElement);

    this.overlay = document.createElement("div");
    this.overlay.className = "office-tags";
    host.appendChild(this.overlay);

    // Lighting: soft sky/ground fill plus one warm sun that casts the baked shadows.
    this.scene.add(new THREE.HemisphereLight("#fff6e6", "#8a7a62", 1.15));
    const sun = new THREE.DirectionalLight("#ffe6c2", 2.6);
    sun.position.set(-12, 24, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -26;
    sc.right = 26;
    sc.top = 20;
    sc.bottom = -20;
    sc.near = 5;
    sc.far = 70;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
    this.scene.add(sun);
    const warm = new THREE.PointLight("#ffcf94", 14, 12, 1.6);
    warm.position.set(-11, 2.4, 6);
    this.scene.add(warm);
    const warm2 = new THREE.PointLight("#ffd9a8", 12, 12, 1.6);
    warm2.position.set(11.5, 2.6, 6);
    this.scene.add(warm2);

    this.world = buildWorld();
    this.scene.add(this.world.root);
    this.nav = new NavGrid(this.world.bounds, this.world.colliders, 0.46);

    // Proximity ring, speaker ripples, click marker
    this.rippleTex = rippleTexture();
    this.ringMat = new THREE.MeshBasicMaterial({ map: proximityTexture(), transparent: true, depthWrite: false, opacity: 0.95 });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(OUTER_RADIUS * 2, OUTER_RADIUS * 2), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.035;
    this.ring.renderOrder = 2;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.markerMat = new THREE.MeshBasicMaterial({ map: this.rippleTex, transparent: true, depthWrite: false, opacity: 0 });
    this.marker = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), this.markerMat);
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.04;
    this.marker.renderOrder = 3;
    this.scene.add(this.marker);

    // Creator podium
    this.podium = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.06, 0.1, 48), new THREE.MeshStandardMaterial({ color: "#efe7d4", roughness: 0.6 }));
    disc.position.y = 0.05;
    disc.receiveShadow = true;
    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.022, 10, 64), new THREE.MeshBasicMaterial({ color: "#e8c98a", toneMapped: false }));
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.105;
    this.podium.add(disc, glow);
    this.podium.position.set(this.world.spawn[0], 0, this.world.spawn[1]);
    this.scene.add(this.podium);

    // People
    this.self = this.addEntity("you", opts.name, true, opts.look, this.world.spawn, false);
    this.self.yaw = this.previewYaw;
    for (const b of BOTS) {
      const e = this.addEntity(b.id, b.name, false, b.look, b.start, b.muted);
      e.yaw = Math.PI * 0.8;
      e.brain = {
        group: b.group,
        leader: b.leader,
        waitUntil: 8 + Math.random() * 14,
        nextSpeakAt: 1 + Math.random() * 5,
        speakUntil: 0,
        greetedAt: -999,
        zones: b.zones,
        nearSince: 0,
      };
    }

    this.selfZoneId = this.zoneAt(this.self.x, this.self.z).id;

    // Input
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener("pointerdown", this.onPointerDown);
    dom.addEventListener("pointermove", this.onPointerMove);
    dom.addEventListener("pointerup", this.onPointerUp);
    dom.addEventListener("pointercancel", this.onPointerUp);
    dom.addEventListener("wheel", this.onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.camTarget.set(this.self.x, 0.98, this.self.z);
    this.applyModeVisibility();
    this.snapCamera();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------------ setup

  private addEntity(id: string, name: string, isSelf: boolean, look: AvatarLook, at: [number, number], muted: boolean): Entity {
    const avatar = new Avatar(look);
    avatar.root.position.set(at[0], 0, at[1]);
    this.scene.add(avatar.root);

    const rippleMat = new THREE.MeshBasicMaterial({ map: this.rippleTexOrNew(), transparent: true, depthWrite: false, opacity: 0 });
    const ripple = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.045;
    ripple.renderOrder = 3;
    this.scene.add(ripple);

    const el = document.createElement("div");
    el.className = "office-tag" + (isSelf ? " is-self" : "");
    el.innerHTML =
      '<div class="office-bubble"></div><div class="office-pill"><span class="office-name"></span><span class="office-mic">' +
      MIC_SVG +
      '</span><span class="office-bars"><i></i><i></i><i></i></span></div>';
    const pill = el.querySelector(".office-pill") as HTMLDivElement;
    (el.querySelector(".office-name") as HTMLElement).textContent = isSelf ? `${name} (you)` : name;
    this.overlay.appendChild(el);

    const e: Entity = {
      id, name, isSelf, avatar,
      x: at[0], z: at[1], yaw: 0, moveSpeed: 0, path: [],
      muted, speaking: false, emote: null, emoteStart: 0, emoteUntil: 0,
      zoneId: "",
      tag: {
        el, pill,
        bubble: el.querySelector(".office-bubble") as HTMLDivElement,
        bars: el.querySelector(".office-bars") as HTMLSpanElement,
        mic: el.querySelector(".office-mic") as HTMLSpanElement,
        last: { speaking: false, muted: !muted, level: -1, far: false, bubble: "" },
        x: -999, y: -999,
      },
      ripple, rippleMat, wasAudible: false, lastNearEvent: -999,
    };
    this.entities.push(e);
    return e;
  }

  private rippleTexOrNew(): THREE.Texture {
    return this.rippleTex ?? rippleTexture();
  }

  // -------------------------------------------------------------- public API

  setMode(mode: EngineMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === "play") {
      this.self.yaw = Math.PI;
      this.podium.visible = false;
      this.self.emote = "wave";
      this.self.emoteStart = this.clock;
      this.self.emoteUntil = this.clock + 1.8;
    } else {
      this.podium.visible = true;
    }
    this.applyModeVisibility();
  }

  private applyModeVisibility(): void {
    const play = this.mode === "play";
    this.overlay.classList.toggle("is-hidden", !play);
    this.ring.visible = play;
    this.podium.visible = !play;
  }

  setLook(look: AvatarLook): void {
    this.self.avatar.setLook(look);
  }

  /** Pixels to push the creator view sideways so the avatar clears the side panel. */
  setCreatorShift(px: number, py = 0): void {
    this.creatorShift = px;
    this.creatorShiftY = py;
  }

  setMuted(muted: boolean): void {
    this.self.muted = muted;
    if (muted) this.selfSpeaking = false;
  }

  /** When true you hear no one (volumes read as zero). */
  setDeafened(deafened: boolean): void {
    this.deafened = deafened;
  }

  setSelfSpeaking(speaking: boolean): void {
    this.selfSpeaking = speaking && !this.self.muted;
  }

  emote(kind: EmoteKind): void {
    this.triggerEmote(this.self, kind);
  }

  attachMinimap(canvas: HTMLCanvasElement | null): void {
    this.minimap = canvas;
  }

  getZones(): ZoneDef[] {
    return this.world.zones;
  }

  zoomBy(delta: number): void {
    this.zoom = Math.min(1.25, Math.max(0.5, this.zoom + delta));
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.resizeObserver.disconnect();
    for (const e of this.entities) e.avatar.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as THREE.MeshStandardMaterial;
          std.map?.dispose();
          mat.dispose();
        }
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.overlay.remove();
  }

  // ------------------------------------------------------------------ input

  private readonly onPointerDown = (e: PointerEvent) => {
    this.pointer = { down: true, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    if (!this.pointer.down) return;
    const dx = e.clientX - this.pointer.x;
    this.pointer.moved += Math.abs(dx) + Math.abs(e.clientY - this.pointer.y);
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    if (this.mode === "creator") this.previewYaw += dx * 0.012;
  };

  private readonly onPointerUp = (e: PointerEvent) => {
    if (!this.pointer.down) return;
    this.pointer.down = false;
    const quick = performance.now() - this.pointer.t < 450;
    if (this.mode === "play" && this.pointer.moved < 8 && quick && e.type === "pointerup") this.clickToMove(e.clientX, e.clientY);
  };

  private readonly onWheel = (e: WheelEvent) => {
    if (this.mode !== "play") return;
    e.preventDefault();
    this.zoomBy(e.deltaY * 0.0008);
  };

  private clickToMove(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -(((clientY - rect.top) / rect.height) * 2 - 1));
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.floorPlane, this.tmp);
    if (!hit) return;
    const path = this.nav.findPath(this.self.x, this.self.z, hit.x, hit.z);
    if (!path) return;
    this.self.path = path;
    const end = path[path.length - 1];
    this.marker.position.set(end[0], 0.04, end[1]);
    this.markerT = 0;
  }

  // ------------------------------------------------------------------ loop

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private readonly frame = (nowMs: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    // rAF timestamps can predate construction, so never let dt go negative.
    const dt = Math.min(0.05, Math.max(0, (nowMs - this.last) / 1000));
    this.last = nowMs;
    this.clock += dt;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private zoneAt(x: number, z: number): ZoneDef {
    const zs = this.world.zones;
    for (const zn of zs) {
      if (zn.id === "commons") continue;
      if (Math.abs(x - zn.x) <= zn.w / 2 && Math.abs(z - zn.z) <= zn.d / 2) return zn;
    }
    return zs[zs.length - 1];
  }

  private triggerEmote(e: Entity, kind: EmoteKind): void {
    e.emote = kind;
    e.emoteStart = this.clock;
    e.emoteUntil = this.clock + EMOTE_LENGTH[kind];
  }

  private update(dt: number): void {
    const play = this.mode === "play";

    this.updateSelf(dt, play);
    for (const e of this.entities) {
      if (e.isSelf) continue;
      this.updateBot(e, dt);
    }
    this.separate();

    for (const e of this.entities) {
      if (e.emote && this.clock > e.emoteUntil) e.emote = null;
      const speaking = e.isSelf ? this.selfSpeaking : e.speaking;
      const walk = Math.min(1, e.moveSpeed / 3.4);
      e.avatar.root.position.set(e.x, 0, e.z);
      // Smoothly turn towards the heading.
      const dy = Math.atan2(Math.sin(e.yaw - e.avatar.root.rotation.y), Math.cos(e.yaw - e.avatar.root.rotation.y));
      e.avatar.root.rotation.y += dy * Math.min(1, dt * 12);
      e.avatar.update(dt, walk, speaking && !e.muted, e.emote, this.clock - e.emoteStart);
      this.updateRipple(e, speaking && !e.muted);
    }

    // Proximity, zones, snapshot
    this.snapTimer -= dt;
    if (this.snapTimer <= 0) {
      this.snapTimer = 0.12;
      this.emitSnapshot();
    }
    this.mapTimer -= dt;
    if (this.mapTimer <= 0) {
      this.mapTimer = 0.1;
      this.drawMinimap();
    }

    // Ring follows you and softly breathes
    this.ring.position.x = this.self.x;
    this.ring.position.z = this.self.z;
    const breathe = 1 + Math.sin(this.clock * 1.6) * 0.012;
    this.ring.scale.set(breathe, breathe, 1);
    this.ringMat.opacity = this.self.muted ? 0.55 : 0.95;

    // Click marker
    if (this.markerT < 1) {
      this.markerT = Math.min(1, this.markerT + dt * 1.6);
      const s = 0.35 + this.markerT * 0.9;
      this.marker.scale.set(s, s, 1);
      this.markerMat.opacity = (1 - this.markerT) * 0.9;
    } else this.markerMat.opacity = 0;

    this.updateCamera(dt, play);
    this.updateTags(play);
  }

  private updateSelf(dt: number, play: boolean): void {
    const s = this.self;
    if (!play) {
      s.moveSpeed = 0;
      s.path = [];
      s.yaw = this.previewYaw;
      this.podium.position.set(s.x, 0, s.z);
      return;
    }
    let ix = 0;
    let iz = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) iz -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) iz += 1;
    const run = this.keys.has("shift");
    const speed = run ? 5.6 : 3.5;

    let vx = 0;
    let vz = 0;
    if (ix || iz) {
      const len = Math.hypot(ix, iz);
      vx = (ix / len) * speed;
      vz = (iz / len) * speed;
      s.path = [];
    } else if (s.path.length) {
      const [tx, tz] = s.path[0];
      const dx = tx - s.x;
      const dz = tz - s.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.14) s.path.shift();
      else {
        vx = (dx / dist) * speed;
        vz = (dz / dist) * speed;
      }
    }

    const before = { x: s.x, z: s.z };
    moveWithCollision(s, vx * dt, vz * dt, 0.42, this.world.colliders, this.world.bounds);
    const moved = Math.hypot(s.x - before.x, s.z - before.z) / Math.max(dt, 1e-4);
    s.moveSpeed += (moved - s.moveSpeed) * Math.min(1, dt * 14);
    if (moved > 0.2) s.yaw = Math.atan2(s.x - before.x, s.z - before.z);
    if (moved > 0.2 && s.emote && s.emote !== "wave") s.emote = null;
  }

  private updateBot(e: Entity, dt: number): void {
    const b = e.brain!;
    const now = this.clock;

    // Follow path
    let vx = 0;
    let vz = 0;
    if (e.path.length) {
      const [tx, tz] = e.path[0];
      const dx = tx - e.x;
      const dz = tz - e.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.16) {
        e.path.shift();
        if (!e.path.length) b.waitUntil = now + (b.leader ? 20 + Math.random() * 26 : 4);
      } else {
        const speed = 2.5;
        vx = (dx / dist) * speed;
        vz = (dz / dist) * speed;
      }
    }
    const bx = e.x;
    const bz = e.z;
    moveWithCollision(e, vx * dt, vz * dt, 0.42, this.world.colliders, this.world.bounds);
    const moved = Math.hypot(e.x - bx, e.z - bz) / Math.max(dt, 1e-4);
    e.moveSpeed += (moved - e.moveSpeed) * Math.min(1, dt * 12);
    if (moved > 0.2) e.yaw = Math.atan2(e.x - bx, e.z - bz);

    // Pick somewhere new
    if (!e.path.length && now > b.waitUntil) {
      if (b.leader) {
        const zone = b.zones[Math.floor(Math.random() * b.zones.length)];
        const list = this.world.pois[zone];
        const [px, pz] = list[Math.floor(Math.random() * list.length)];
        this.sendBot(e, px, pz);
        for (const f of this.entities) {
          if (f.brain && !f.brain.leader && f.brain.group === b.group) this.sendBot(f, px + 1.1, pz + 0.5);
        }
      }
      b.waitUntil = now + 3;
    }

    // Face whoever is close while chatting
    let nearest: Entity | null = null;
    let nearD = 3.4;
    for (const o of this.entities) {
      if (o === e) continue;
      const d = Math.hypot(o.x - e.x, o.z - e.z);
      if (d < nearD) {
        nearD = d;
        nearest = o;
      }
    }
    if (nearest && !e.path.length) e.yaw = Math.atan2(nearest.x - e.x, nearest.z - e.z);

    // Turn-taking
    if (e.muted) e.speaking = false;
    else if (nearest && !e.path.length) {
      let othersSpeaking = false;
      for (const o of this.entities) {
        if (o === e) continue;
        const d = Math.hypot(o.x - e.x, o.z - e.z);
        if (d < 4 && (o.isSelf ? this.selfSpeaking : o.speaking)) othersSpeaking = true;
      }
      if (e.speaking && now > b.speakUntil) {
        e.speaking = false;
        b.nextSpeakAt = now + 1.0 + Math.random() * 3;
      } else if (!e.speaking && !othersSpeaking && now > b.nextSpeakAt) {
        e.speaking = true;
        b.speakUntil = now + 1.8 + Math.random() * 3.4;
      }
    } else e.speaking = false;

    // Say hello when you walk up
    const self = this.self;
    const ds = Math.hypot(self.x - e.x, self.z - e.z);
    if (this.mode === "play" && ds < 3.3 && now - b.greetedAt > 60 && !e.emote && !e.path.length) {
      b.greetedAt = now;
      this.triggerEmote(e, "wave");
      e.yaw = Math.atan2(self.x - e.x, self.z - e.z);
      this.opts.onEvent({ type: "wave", name: e.name });
    }
  }

  private sendBot(e: Entity, tx: number, tz: number): void {
    const p = this.nav.findPath(e.x, e.z, tx, tz);
    if (p) e.path = p;
  }

  /** Gentle push so avatars never stand inside each other. */
  private separate(): void {
    const list = this.entities;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 0 && d < 0.8) {
          const push = (0.8 - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          if (!a.isSelf) {
            a.x -= nx * push * (b.isSelf ? 1 : 0.5);
            a.z -= nz * push * (b.isSelf ? 1 : 0.5);
          }
          if (!b.isSelf) {
            b.x += nx * push * (a.isSelf ? 1 : 0.5);
            b.z += nz * push * (a.isSelf ? 1 : 0.5);
          }
        }
      }
    }
  }

  private updateRipple(e: Entity, speaking: boolean): void {
    const m = e.rippleMat;
    if (speaking && this.mode === "play") {
      const t = (this.clock * 0.85 + (e.x * 0.37)) % 1;
      const s = 0.9 + t * 3.1;
      e.ripple.scale.set(s, s, 1);
      m.opacity = (1 - t) * 0.75;
    } else m.opacity = Math.max(0, m.opacity - 0.05);
    e.ripple.position.x = e.x;
    e.ripple.position.z = e.z;
  }

  // ----------------------------------------------------------------- camera

  /** Jump the camera straight to where it is heading (no easing). */
  snapCamera(): void {
    this.updateCamera(1000, this.mode === "play", true);
    this.camera.updateMatrixWorld();
  }

  private updateCamera(dt: number, play: boolean, snap = false): void {
    const aspect = this.width / this.height;
    let desiredTarget: THREE.Vector3;
    const desiredOffset = new THREE.Vector3();
    let desiredShift = 0;
    let desiredShiftY = 0;

    if (play) {
      const boost = Math.min(2.2, Math.max(1, 1.5 / aspect));
      const dist = 24 * this.zoom * boost;
      const tilt = THREE.MathUtils.degToRad(51);
      desiredOffset.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist);
      const visW = dist * 0.917 * (aspect / 1.6);
      const visD = (visW / aspect) / Math.sin(tilt);
      const maxX = Math.max(0, 16 - visW / 2 + 2.5);
      const maxZ = Math.max(0, 10 - visD / 2 + 3);
      desiredTarget = new THREE.Vector3(
        THREE.MathUtils.clamp(this.self.x, -maxX, maxX),
        0,
        THREE.MathUtils.clamp(this.self.z, -maxZ, maxZ)
      );
    } else {
      desiredTarget = new THREE.Vector3(this.self.x, 0.98, this.self.z);
      desiredOffset.set(0, 0.5, 5.7 * Math.max(1, 1.1 / Math.min(aspect, 1.1)));
      desiredShift = this.creatorShift;
      desiredShiftY = this.creatorShiftY;
    }

    const k = snap ? 1 : 1 - Math.exp(-dt * (play ? 3.2 : 3.6));
    this.camTarget.lerp(desiredTarget, k);
    this.camOffset.lerp(desiredOffset, k);
    this.viewShift += (desiredShift - this.viewShift) * k;
    this.viewShiftY += (desiredShiftY - this.viewShiftY) * k;

    this.camera.position.copy(this.camTarget).add(this.camOffset);
    this.camera.lookAt(this.camTarget);
    if (Math.abs(this.viewShift) > 0.5 || Math.abs(this.viewShiftY) > 0.5) this.camera.setViewOffset(this.width, this.height, this.viewShift, this.viewShiftY, this.width, this.height);
    else this.camera.clearViewOffset();
    this.camera.updateMatrixWorld();
  }

  // ------------------------------------------------------------- tags + data

  private updateTags(play: boolean): void {
    if (!play) return;
    const selfZone = this.zoneAt(this.self.x, this.self.z);
    for (const e of this.entities) {
      const t = e.tag;
      this.tmp.set(e.x, 2.12, e.z).project(this.camera);
      const sx = (this.tmp.x * 0.5 + 0.5) * this.width;
      const sy = (-this.tmp.y * 0.5 + 0.5) * this.height;
      if (Math.abs(sx - t.x) > 0.3 || Math.abs(sy - t.y) > 0.3) {
        t.x = sx;
        t.y = sy;
        t.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      }

      const speaking = (e.isSelf ? this.selfSpeaking : e.speaking) && !e.muted;
      const dist = Math.hypot(e.x - this.self.x, e.z - this.self.z);
      const vol = e.isSelf ? 1 : this.audibleVolume(e, dist, selfZone);
      const level = Math.round(vol * 3);
      const far = !e.isSelf && vol <= 0;
      const L = t.last;
      if (L.speaking !== speaking) {
        t.el.classList.toggle("is-speaking", speaking);
        L.speaking = speaking;
      }
      if (L.muted !== e.muted) {
        t.el.classList.toggle("is-muted", e.muted);
        L.muted = e.muted;
      }
      if (L.far !== far) {
        t.el.classList.toggle("is-far", far);
        L.far = far;
      }
      if (L.level !== level) {
        t.bars.dataset.level = String(level);
        L.level = level;
      }
      const emoji = e.emote ? EMOTES.find((m) => m.id === e.emote)?.emoji ?? "" : "";
      if (L.bubble !== emoji) {
        t.bubble.textContent = emoji;
        t.bubble.classList.toggle("show", Boolean(emoji));
        L.bubble = emoji;
      }
    }
  }

  /** What you would hear from `e`, accounting for private rooms. */
  private audibleVolume(e: Entity, dist: number, selfZone: ZoneDef): number {
    if (this.deafened) return 0;
    const ez = this.zoneAt(e.x, e.z);
    if (selfZone.private && ez.id !== selfZone.id) return 0;
    if (ez.private && ez.id !== selfZone.id) return 0;
    return volumeAt(dist);
  }

  private emitSnapshot(): void {
    if (this.mode !== "play") {
      this.opts.onSnapshot(this.buildSnapshot(this.zoneAt(this.self.x, this.self.z)));
      return;
    }
    const zone = this.zoneAt(this.self.x, this.self.z);
    if (zone.id !== this.selfZoneId) {
      this.selfZoneId = zone.id;
      this.opts.onEvent({ type: "zone", zoneId: zone.id, zoneName: zone.name, zonePrivate: zone.private });
    }
    const snap = this.buildSnapshot(zone);
    for (const p of snap.people) {
      const e = this.entities.find((x) => x.id === (p.isSelf ? "you" : p.id));
      if (!e || e.isSelf) continue;
      const audible = p.volume > 0;
      if (audible && !e.wasAudible && this.clock - e.lastNearEvent > 30) {
        e.lastNearEvent = this.clock;
        this.opts.onEvent({ type: "near", name: e.name });
      }
      e.wasAudible = audible;
    }
    this.opts.onSnapshot(snap);
  }

  private buildSnapshot(zone: ZoneDef): OfficeSnapshot {
    const people: PersonSnapshot[] = this.entities.map((e) => {
      const d = Math.hypot(e.x - this.self.x, e.z - this.self.z);
      const ez = this.zoneAt(e.x, e.z);
      e.zoneId = ez.id;
      return {
        id: e.id,
        name: e.name,
        isSelf: e.isSelf,
        look: e.avatar.look,
        muted: e.muted,
        speaking: (e.isSelf ? this.selfSpeaking : e.speaking) && !e.muted,
        distance: d,
        volume: e.isSelf ? 1 : this.audibleVolume(e, d, zone),
        zoneId: ez.id,
        zoneName: ez.name,
      };
    });
    people.sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : a.distance - b.distance));
    return { people, zoneId: zone.id, zoneName: zone.name, zonePrivate: zone.private };
  }

  // ---------------------------------------------------------------- minimap

  private drawMinimap(): void {
    const c = this.minimap;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    const pad = 6;
    const sx = (w - pad * 2) / 32;
    const sz = (h - pad * 2) / 20;
    const mx = (x: number) => pad + (x + 16) * sx;
    const mz = (z: number) => pad + (z + 10) * sz;

    g.fillStyle = "rgba(239,231,212,0.1)";
    g.beginPath();
    g.roundRect(pad - 2, pad - 2, w - pad * 2 + 4, h - pad * 2 + 4, 5);
    g.fill();

    for (const zn of this.world.zones) {
      if (zn.id === "commons") continue;
      g.fillStyle = zn.color + "55";
      g.strokeStyle = zn.color + (zn.private ? "ee" : "99");
      g.lineWidth = zn.private ? 1.5 : 1;
      if (zn.private) g.setLineDash([3, 2]);
      g.beginPath();
      g.roundRect(mx(zn.x - zn.w / 2), mz(zn.z - zn.d / 2), zn.w * sx, zn.d * sz, 3);
      g.fill();
      g.stroke();
      g.setLineDash([]);
    }
    g.fillStyle = "rgba(255,255,255,0.14)";
    for (const col of this.world.colliders) g.fillRect(mx(col.x - col.w / 2), mz(col.z - col.d / 2), Math.max(1, col.w * sx), Math.max(1, col.d * sz));

    if (this.mode === "play") {
      g.strokeStyle = "rgba(232,201,138,0.8)";
      g.fillStyle = "rgba(232,201,138,0.1)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(mx(this.self.x), mz(this.self.z), OUTER_RADIUS * sx, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    for (const e of this.entities) {
      const speaking = (e.isSelf ? this.selfSpeaking : e.speaking) && !e.muted;
      g.beginPath();
      g.arc(mx(e.x), mz(e.z), e.isSelf ? 4 : 3, 0, Math.PI * 2);
      g.fillStyle = e.isSelf ? "#e8c98a" : "#f4efe2";
      g.fill();
      g.lineWidth = speaking ? 2 : 1;
      g.strokeStyle = speaking ? "#7be0a5" : "rgba(18,33,28,0.8)";
      g.stroke();
    }
  }
}
