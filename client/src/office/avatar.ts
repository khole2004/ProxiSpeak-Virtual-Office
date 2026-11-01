import * as THREE from "three";
import type { AvatarLook, EmoteKind } from "./types";

/**
 * A stylised 3D character built from smooth primitives (capsules, spheres),
 * lit by the scene like everything else. Faces +Z. About 1.77 m tall.
 *
 * Geometry is shared between all avatars; each avatar owns only its materials,
 * so adding people costs almost nothing.
 */

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g as T;
}

const HEAD_R = 0.34;
const HC = 0.28; // head centre above the neck pivot
const SCALE = 0.86;

let shadowTexture: THREE.CanvasTexture | null = null;
function getShadowTexture(): THREE.CanvasTexture {
  if (shadowTexture) return shadowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, "rgba(10,14,12,0.55)");
  grad.addColorStop(0.55, "rgba(10,14,12,0.22)");
  grad.addColorStop(1, "rgba(10,14,12,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(c);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  return shadowTexture;
}

const eyeMat = new THREE.MeshStandardMaterial({ color: "#1a1412", roughness: 0.25, metalness: 0 });
const eyeShine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
const mouthMat = new THREE.MeshStandardMaterial({ color: "#7a3b36", roughness: 0.6 });
const mouthInner = new THREE.MeshStandardMaterial({ color: "#3a1612", roughness: 0.8 });
const blushMat = new THREE.MeshStandardMaterial({ color: "#f19a8f", roughness: 1, transparent: true, opacity: 0.45 });
const shoeMat = new THREE.MeshStandardMaterial({ color: "#f3efe6", roughness: 0.55 });
const soleMat = new THREE.MeshStandardMaterial({ color: "#d8d1c2", roughness: 0.8 });
const glassMat = new THREE.MeshStandardMaterial({ color: "#222a2c", roughness: 0.35, metalness: 0.4 });
const phonesMat = new THREE.MeshStandardMaterial({ color: "#2b3330", roughness: 0.45, metalness: 0.2 });
const phonesAccent = new THREE.MeshStandardMaterial({ color: "#d9b774", roughness: 0.35, metalness: 0.6 });

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.receiveShadow = true;
  return o;
}

export class Avatar {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly hair = new THREE.Group();
  private readonly accessory = new THREE.Group();
  private readonly mouthSmile: THREE.Mesh;
  private readonly mouthTalk: THREE.Group;
  private readonly torso: THREE.Mesh;

  private readonly skinMat = new THREE.MeshStandardMaterial({ roughness: 0.62 });
  private readonly hairMat = new THREE.MeshStandardMaterial({ roughness: 0.72 });
  private readonly topMat = new THREE.MeshStandardMaterial({ roughness: 0.78 });
  private readonly bottomMat = new THREE.MeshStandardMaterial({ roughness: 0.82 });
  private readonly capMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });

  private phase = Math.random() * 6;
  private t = Math.random() * 20;
  private walkAmt = 0;
  private talkAmt = 0;
  private pop = 0;
  private lookKey = "";
  look: AvatarLook;

  constructor(look: AvatarLook) {
    this.look = look;

    // Contact shadow (the real shadow map is baked once for the static scene).
    const sh = new THREE.Mesh(
      geo("shadow", () => new THREE.PlaneGeometry(1.5, 1.5)),
      new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.025;
    sh.renderOrder = 1;
    this.root.add(sh);

    this.root.add(this.body);
    this.body.scale.setScalar(SCALE);

    // Torso, pelvis
    this.torso = mesh(geo("torso", () => new THREE.CapsuleGeometry(0.24, 0.18, 8, 20)), this.topMat, 0, 1.13, 0);
    this.torso.scale.set(1, 1, 0.84);
    const pelvis = mesh(geo("pelvis", () => new THREE.CylinderGeometry(0.235, 0.225, 0.18, 20)), this.bottomMat, 0, 0.88, 0);
    pelvis.scale.set(1, 1, 0.86);
    this.body.add(this.torso, pelvis);

    // Legs
    for (const [leg, side] of [[this.legL, -1], [this.legR, 1]] as const) {
      leg.position.set(side * 0.125, 0.9, 0);
      leg.add(mesh(geo("leg", () => new THREE.CapsuleGeometry(0.108, 0.52, 6, 14)), this.bottomMat, 0, -0.38, 0));
      const shoe = mesh(geo("shoe", () => new THREE.SphereGeometry(0.13, 16, 12)), shoeMat, 0, -0.8, 0.06);
      shoe.scale.set(0.95, 0.62, 1.4);
      const sole = mesh(geo("sole", () => new THREE.CylinderGeometry(0.115, 0.125, 0.025, 14)), soleMat, 0, -0.865, 0.07);
      sole.scale.set(1, 1, 1.5);
      leg.add(shoe, sole);
      this.body.add(leg);
    }

    // Arms (pivot at the shoulder)
    for (const [arm, side] of [[this.armL, -1], [this.armR, 1]] as const) {
      arm.position.set(side * 0.3, 1.36, 0);
      arm.add(mesh(geo("sleeve", () => new THREE.CapsuleGeometry(0.098, 0.15, 6, 14)), this.topMat, 0, -0.11, 0));
      arm.add(mesh(geo("forearm", () => new THREE.CapsuleGeometry(0.075, 0.28, 6, 14)), this.skinMat, 0, -0.36, 0));
      arm.add(mesh(geo("hand", () => new THREE.SphereGeometry(0.088, 14, 10)), this.skinMat, 0, -0.56, 0));
      this.body.add(arm);
    }

    // Neck + head
    this.body.add(mesh(geo("neck", () => new THREE.CylinderGeometry(0.075, 0.09, 0.14, 12)), this.skinMat, 0, 1.5, 0));
    this.head.position.set(0, 1.46, 0);
    this.body.add(this.head);

    const skull = mesh(geo("skull", () => new THREE.SphereGeometry(HEAD_R, 32, 24)), this.skinMat, 0, HC, 0);
    skull.scale.set(1, 0.95, 1);
    this.head.add(skull);

    for (const side of [-1, 1]) {
      const ear = mesh(geo("ear", () => new THREE.SphereGeometry(0.06, 12, 10)), this.skinMat, side * 0.335, HC - 0.02, 0);
      ear.scale.set(0.55, 1, 0.9);
      this.head.add(ear);

      const eye = mesh(geo("eye", () => new THREE.SphereGeometry(0.046, 14, 12)), eyeMat, side * 0.125, HC + 0.01, 0.298);
      eye.scale.set(0.95, 1.3, 0.55);
      const shine = mesh(geo("shine", () => new THREE.SphereGeometry(0.013, 8, 6)), eyeShine, side * 0.125 + 0.014, HC + 0.04, 0.326);
      this.head.add(eye, shine);

      const blush = mesh(geo("blush", () => new THREE.SphereGeometry(0.055, 12, 8)), blushMat, side * 0.205, HC - 0.075, 0.262);
      blush.scale.set(1, 0.65, 0.3);
      blush.rotation.y = side * 0.68;
      this.head.add(blush);
    }
    this.head.add(mesh(geo("nose", () => new THREE.SphereGeometry(0.032, 10, 8)), this.skinMat, 0, HC - 0.05, 0.337));

    this.mouthSmile = mesh(geo("smile", () => new THREE.TorusGeometry(0.052, 0.0105, 6, 16, Math.PI)), mouthMat, 0, HC - 0.088, 0.318);
    this.mouthSmile.rotation.z = Math.PI;
    this.head.add(this.mouthSmile);

    this.mouthTalk = new THREE.Group();
    this.mouthTalk.position.set(0, HC - 0.115, 0.316);
    const hole = mesh(geo("mouth", () => new THREE.SphereGeometry(0.05, 14, 10)), mouthInner, 0, 0, 0);
    hole.scale.set(1, 0.8, 0.35);
    this.mouthTalk.add(hole);
    this.mouthTalk.visible = false;
    this.head.add(this.mouthTalk);

    this.head.add(this.hair, this.accessory);

    this.applyLook(look);
  }

  /** Recolour and rebuild hair and accessories. */
  setLook(look: AvatarLook): void {
    this.look = look;
    this.applyLook(look);
    this.pop = 1;
  }

  private applyLook(look: AvatarLook): void {
    const key = JSON.stringify(look);
    if (key === this.lookKey) return;
    this.lookKey = key;

    this.skinMat.color.set(look.skin);
    this.hairMat.color.set(look.hairColor);
    this.topMat.color.set(look.top);
    this.bottomMat.color.set(look.bottom);
    this.capMat.color.set(look.top).multiplyScalar(0.8);

    this.hair.clear();
    this.accessory.clear();
    this.buildHair(look.hairStyle);
    this.buildAccessory(look.accessory);
  }

  private buildHair(style: AvatarLook["hairStyle"]): void {
    const m = this.hairMat;
    const hr = HEAD_R + 0.028;
    const dome = (angle: number) => {
      const d = mesh(geo(`dome${angle}`, () => new THREE.SphereGeometry(hr, 28, 18, 0, Math.PI * 2, 0, Math.PI * angle)), m, 0, HC, 0);
      d.rotation.x = -0.22;
      return d;
    };

    switch (style) {
      case "short": {
        this.hair.add(dome(0.45));
        const fringe = mesh(geo("fringe", () => new THREE.SphereGeometry(0.2, 16, 10)), m, 0.05, HC + 0.3, 0.15);
        fringe.scale.set(1.15, 0.42, 0.62);
        fringe.rotation.z = -0.15;
        this.hair.add(fringe);
        break;
      }
      case "long": {
        this.hair.add(dome(0.5));
        const back = mesh(geo("hairBack", () => new THREE.CapsuleGeometry(0.27, 0.42, 8, 16)), m, 0, HC - 0.2, -0.17);
        back.scale.set(1.05, 1, 0.62);
        this.hair.add(back);
        for (const s of [-1, 1]) {
          const lock = mesh(geo("lock", () => new THREE.CapsuleGeometry(0.075, 0.32, 6, 10)), m, s * 0.3, HC - 0.1, 0.02);
          this.hair.add(lock);
        }
        const fringe = mesh(geo("fringeL", () => new THREE.SphereGeometry(0.2, 16, 10)), m, 0, HC + 0.3, 0.15);
        fringe.scale.set(1.25, 0.42, 0.6);
        this.hair.add(fringe);
        break;
      }
      case "bun": {
        this.hair.add(dome(0.45));
        this.hair.add(mesh(geo("bun", () => new THREE.SphereGeometry(0.14, 16, 12)), m, 0, HC + 0.4, -0.1));
        const fringe = mesh(geo("fringe", () => new THREE.SphereGeometry(0.2, 16, 10)), m, 0.04, HC + 0.3, 0.15);
        fringe.scale.set(1.15, 0.42, 0.62);
        this.hair.add(fringe);
        break;
      }
      case "curly": {
        const n = 20;
        for (let i = 0; i < n; i++) {
          const y = 1 - (i / (n - 1)) * 0.95;
          const r = Math.sqrt(1 - y * y);
          const a = i * 2.399963;
          const px = Math.cos(a) * r * (HEAD_R + 0.04);
          const pz = Math.sin(a) * r * (HEAD_R + 0.04);
          if (pz > 0.18 && y < 0.55) continue; // keep the face clear
          this.hair.add(mesh(geo("curl", () => new THREE.SphereGeometry(0.12, 12, 10)), m, px, HC + y * (HEAD_R + 0.04) * 0.97, pz));
        }
        break;
      }
      case "spiky": {
        this.hair.add(dome(0.44));
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const cone = mesh(geo("spike", () => new THREE.ConeGeometry(0.075, 0.24, 8)), m, Math.sin(a) * 0.17, HC + 0.34, Math.cos(a) * 0.17 - 0.03);
          cone.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
          this.hair.add(cone);
        }
        this.hair.add(mesh(geo("spikeC", () => new THREE.ConeGeometry(0.085, 0.3, 8)), m, 0, HC + 0.45, -0.02));
        break;
      }
      case "cap": {
        const back = mesh(geo("capHair", () => new THREE.CapsuleGeometry(0.2, 0.1, 6, 12)), m, 0, HC - 0.08, -0.22);
        back.scale.set(1.2, 1, 0.6);
        this.hair.add(back);
        const d = mesh(geo("capDome", () => new THREE.SphereGeometry(HEAD_R + 0.045, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)), this.capMat, 0, HC + 0.04, 0);
        d.rotation.x = -0.12;
        this.hair.add(d);
        const brim = mesh(geo("brim", () => new THREE.CylinderGeometry(0.3, 0.3, 0.03, 24, 1, false, -Math.PI / 2, Math.PI)), this.capMat, 0, HC + 0.17, 0.13);
        brim.rotation.x = 0.14;
        this.hair.add(brim);
        break;
      }
      case "bald":
        break;
    }
  }

  private buildAccessory(acc: AvatarLook["accessory"]): void {
    if (acc === "glasses") {
      for (const s of [-1, 1]) {
        const rim = mesh(geo("rim", () => new THREE.TorusGeometry(0.08, 0.0125, 8, 24)), glassMat, s * 0.125, HC + 0.015, 0.318);
        this.accessory.add(rim);
        const temple = mesh(geo("temple", () => new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6)), glassMat, s * 0.2, HC + 0.02, 0.17);
        temple.rotation.x = Math.PI / 2;
        temple.rotation.z = s * -0.18;
        this.accessory.add(temple);
      }
      const bridge = mesh(geo("bridge", () => new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6)), glassMat, 0, HC + 0.03, 0.325);
      bridge.rotation.z = Math.PI / 2;
      this.accessory.add(bridge);
    } else if (acc === "headphones") {
      const band = mesh(geo("band", () => new THREE.TorusGeometry(0.385, 0.03, 10, 28, Math.PI)), phonesMat, 0, HC - 0.01, 0);
      this.accessory.add(band);
      for (const s of [-1, 1]) {
        const cup = mesh(geo("cup", () => new THREE.CylinderGeometry(0.115, 0.115, 0.08, 20)), phonesMat, s * 0.385, HC - 0.02, 0);
        cup.rotation.z = Math.PI / 2;
        const ring = mesh(geo("cupRing", () => new THREE.CylinderGeometry(0.095, 0.095, 0.095, 20)), phonesAccent, s * 0.385, HC - 0.02, 0);
        ring.rotation.z = Math.PI / 2;
        this.accessory.add(ring, cup);
      }
    }
  }

  /**
   * Advance the animation.
   * @param walk 0..1 how fast the avatar is moving
   */
  update(dt: number, walk: number, speaking: boolean, emote: EmoteKind | null, emoteT: number): void {
    this.t += dt;
    this.walkAmt += (walk - this.walkAmt) * Math.min(1, dt * 10);
    this.talkAmt += ((speaking ? 1 : 0) - this.talkAmt) * Math.min(1, dt * 12);
    this.pop = Math.max(0, this.pop - dt * 2.4);

    const w = this.walkAmt;
    this.phase += dt * (5.5 + w * 4);
    const swing = Math.sin(this.phase) * 0.75 * w;

    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.set(-swing * 0.8, 0, 0.06);
    this.armR.rotation.set(swing * 0.8, 0, -0.06);

    let bob = Math.abs(Math.sin(this.phase)) * 0.045 * w;
    let sway = 0;
    let lean = 0.06 * w;
    let headTilt = 0;

    // Breathing when still
    const breathe = Math.sin(this.t * 2.1) * 0.008;
    this.torso.scale.y = 1 + breathe * 2;

    // Talking: little nods and an open mouth
    const talk = this.talkAmt;
    if (talk > 0.02) {
      const open = (Math.sin(this.t * 17) * 0.5 + 0.5) * (Math.sin(this.t * 6.3) * 0.5 + 0.55);
      this.mouthTalk.scale.set(1, 0.25 + Math.max(0, open) * 1.1, 1);
      headTilt += Math.sin(this.t * 5.2) * 0.05 * talk;
    }
    this.mouthTalk.visible = talk > 0.3;
    this.mouthSmile.visible = talk <= 0.3;

    // Emotes
    if (emote) {
      const e = emoteT;
      switch (emote) {
        case "wave":
          this.armR.rotation.set(0, 0, 2.75 + Math.sin(e * 13) * 0.32);
          headTilt += 0.08;
          break;
        case "clap": {
          const c = Math.sin(e * 15) * 0.18;
          this.armL.rotation.set(-1.25, 0, 0.55 - c);
          this.armR.rotation.set(-1.25, 0, -0.55 + c);
          break;
        }
        case "heart":
          this.armL.rotation.set(0, 0, -2.75);
          this.armR.rotation.set(0, 0, 2.75);
          headTilt += Math.sin(e * 5) * 0.08;
          bob += Math.abs(Math.sin(e * 5)) * 0.02;
          break;
        case "laugh":
          bob += Math.abs(Math.sin(e * 20)) * 0.04;
          headTilt -= 0.25;
          lean = -0.12;
          this.armL.rotation.set(-0.5, 0, 0.5);
          this.armR.rotation.set(-0.5, 0, -0.5);
          break;
        case "thumbs":
          this.armR.rotation.set(-1.35 - Math.sin(e * 9) * 0.1, 0, -0.3);
          headTilt += 0.1;
          break;
        case "dance": {
          const b = Math.sin(e * 9);
          bob += Math.abs(b) * 0.09;
          sway = b * 0.16;
          this.armL.rotation.set(0, 0, -2.5 + Math.sin(e * 9 + 1) * 0.4);
          this.armR.rotation.set(0, 0, 2.5 - Math.sin(e * 9 + 1) * 0.4);
          this.legL.rotation.x = Math.sin(e * 9) * 0.35;
          this.legR.rotation.x = -Math.sin(e * 9) * 0.35;
          break;
        }
      }
    }

    // "Pop" when the look changes
    const popK = Math.sin(this.pop * Math.PI) * 0.07;
    this.body.scale.set(SCALE * (1 + popK * 0.6), SCALE * (1 + popK), SCALE * (1 + popK * 0.6));
    this.body.position.y = bob;
    this.body.rotation.z = sway;
    this.body.rotation.x = lean;
    this.head.rotation.set(-lean * 0.7, 0, headTilt);
  }

  dispose(): void {
    for (const m of [this.skinMat, this.hairMat, this.topMat, this.bottomMat, this.capMat]) m.dispose();
  }
}
