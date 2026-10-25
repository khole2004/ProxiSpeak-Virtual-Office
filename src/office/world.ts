import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ZoneDef } from "./types";
import {
  carpetTexture,
  floorTexture,
  labelTexture,
  loungeRugTexture,
  roundRugTexture,
  tileTexture,
  windowTexture,
  wordmarkTexture,
} from "./textures";

/**
 * The office: a cutaway "dollhouse" in metres. x runs left/right, z towards the
 * camera, y up. Everything static is merged into a handful of meshes per
 * material at the end, so hundreds of furniture parts draw in a few calls.
 */

export interface Collider {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface World {
  root: THREE.Group;
  colliders: Collider[];
  zones: ZoneDef[];
  pois: Record<string, [number, number][]>;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: [number, number];
}

const P = {
  wall: "#2d4d41",
  wallDark: "#1f3a30",
  trim: "#efe7d4",
  oak: "#c79f6b",
  oakLight: "#dcbd90",
  walnut: "#6a4630",
  cream: "#f1ead9",
  sage: "#8aa391",
  sageDark: "#5f7d6b",
  evergreen: "#2b4a3e",
  brass: "#d9b774",
  charcoal: "#2e3532",
  terracotta: "#c4764a",
  mustard: "#d9a548",
  leaf1: "#4f8a5b",
  leaf2: "#6aa56a",
  leaf3: "#3d7350",
  pot: "#e4d9c3",
  metal: "#b6bdb9",
  fabric: "#a5b0aa",
};

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function M(color: string, roughness = 0.82, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    matCache.set(key, m);
  }
  return m;
}

const screenMat = new THREE.MeshStandardMaterial({ color: "#0f171b", emissive: "#7bbcd8", emissiveIntensity: 0.6, roughness: 0.4 });
const lampMat = new THREE.MeshStandardMaterial({ color: "#ffe3b0", emissive: "#ffcf86", emissiveIntensity: 0.9, roughness: 0.6, side: THREE.DoubleSide });
const brassGlow = new THREE.MeshStandardMaterial({ color: "#d9b774", emissive: "#b88a3c", emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.7 });

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Builder {
  readonly root = new THREE.Group();
  readonly colliders: Collider[] = [];

  group(x: number, z: number, ry = 0): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    this.root.add(g);
    return g;
  }

  private place(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, cast: boolean): THREE.Mesh {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    m.userData.merge = true;
    parent.add(m);
    return m;
  }

  /** Rounded box centred at (x, y, z). */
  box(p: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, radius = 0.02, cast = true): THREE.Mesh {
    const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
    return this.place(p, new RoundedBoxGeometry(w, h, d, 2, r), mat, x, y, z, cast);
  }

  cyl(p: THREE.Object3D, rt: number, rb: number, h: number, x: number, y: number, z: number, mat: THREE.Material, seg = 24, cast = true): THREE.Mesh {
    return this.place(p, new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, cast);
  }

  ball(p: THREE.Object3D, r: number, x: number, y: number, z: number, mat: THREE.Material, detail = 2, cast = true): THREE.Mesh {
    return this.place(p, new THREE.IcosahedronGeometry(r, detail), mat, x, y, z, cast);
  }

  collide(x: number, z: number, w: number, d: number, ry = 0): void {
    const q = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
    this.colliders.push({ x, z, w: q ? d : w, d: q ? w : d });
  }

  // ---------------------------------------------------------------- furniture

  chair(x: number, z: number, ry: number, color: string): void {
    const g = this.group(x, z, ry);
    const fabric = M(color, 0.85);
    this.box(g, 0.5, 0.08, 0.5, 0, 0.5, 0, fabric, 0.035);
    this.box(g, 0.48, 0.5, 0.07, 0, 0.83, -0.22, fabric, 0.035);
    this.cyl(g, 0.03, 0.03, 0.42, 0, 0.27, 0, M(P.charcoal, 0.5, 0.4), 10);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const arm = this.box(g, 0.3, 0.03, 0.055, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15, M(P.charcoal, 0.5, 0.4), 0.012, false);
      arm.rotation.y = -a;
    }
  }

  desk(x: number, z: number, withChair: string | null = null): void {
    const g = this.group(x, z);
    this.box(g, 2.2, 0.06, 0.95, 0, 0.74, 0, M(P.oakLight), 0.025);
    this.box(g, 0.06, 0.72, 0.85, -1.0, 0.36, 0, M(P.walnut));
    this.box(g, 0.06, 0.72, 0.85, 1.0, 0.36, 0, M(P.walnut));
    this.box(g, 0.45, 0.5, 0.7, 0.72, 0.4, 0, M(P.walnut), 0.02);
    this.box(g, 0.06, 0.22, 0.06, 0, 0.88, -0.22, M(P.charcoal, 0.5, 0.3), 0.01);
    this.box(g, 0.8, 0.47, 0.035, 0, 1.13, -0.22, M(P.charcoal, 0.5, 0.2), 0.015);
    this.box(g, 0.74, 0.41, 0.01, 0, 1.13, -0.2, screenMat, 0.004, false);
    this.box(g, 0.44, 0.015, 0.15, -0.1, 0.775, 0.15, M(P.charcoal), 0.006, false);
    this.box(g, 0.06, 0.02, 0.1, 0.3, 0.78, 0.15, M(P.charcoal), 0.008, false);
    this.cyl(g, 0.045, 0.04, 0.09, -0.8, 0.82, 0.1, M(P.cream), 12, false);
    this.cyl(g, 0.06, 0.05, 0.08, 0.85, 0.81, -0.28, M(P.terracotta), 12, false);
    this.ball(g, 0.07, 0.85, 0.89, -0.28, M(P.leaf2), 1, false);
    this.collide(x, z, 2.2, 0.95);
    if (withChair) this.chair(x - 0.1, z + 0.95, 0.15, withChair);
  }

  sofa(x: number, z: number, ry: number, len: number, color: string, pillow: string): void {
    const g = this.group(x, z, ry);
    const fabric = M(color, 0.92);
    const light = M(new THREE.Color(color).offsetHSL(0, 0, 0.04).getStyle(), 0.92);
    this.box(g, len, 0.4, 0.95, 0, 0.3, 0, fabric, 0.07);
    this.box(g, len, 0.62, 0.24, 0, 0.7, -0.36, fabric, 0.09);
    for (const s of [-1, 1]) this.box(g, 0.24, 0.5, 0.95, s * (len / 2 - 0.12), 0.5, 0, fabric, 0.09);
    const n = Math.max(2, Math.round((len - 0.4) / 0.95));
    const cw = (len - 0.56) / n;
    for (let i = 0; i < n; i++) this.box(g, cw - 0.03, 0.16, 0.72, -((len - 0.56) / 2) + cw * (i + 0.5), 0.58, 0.1, light, 0.07);
    for (const s of [-1, 1]) this.cyl(g, 0.035, 0.03, 0.12, s * (len / 2 - 0.2), 0.06, 0.34, M(P.walnut), 8, false);
    for (const s of [-1, 1]) this.cyl(g, 0.035, 0.03, 0.12, s * (len / 2 - 0.2), 0.06, -0.34, M(P.walnut), 8, false);
    const pl = this.box(g, 0.4, 0.4, 0.13, -len / 2 + 0.55, 0.86, -0.18, M(pillow, 0.9), 0.06);
    pl.rotation.set(-0.25, 0.2, 0.1);
    const pr = this.box(g, 0.36, 0.36, 0.12, len / 2 - 0.55, 0.84, -0.18, M(P.cream, 0.9), 0.06);
    pr.rotation.set(-0.25, -0.25, -0.12);
    this.collide(x, z, len, 0.95, ry);
  }

  coffeeTable(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, 0.62, 0.62, 0.05, 0, 0.42, 0, M(P.oakLight), 36);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      this.cyl(g, 0.025, 0.02, 0.4, Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4, M(P.walnut), 8, false);
    }
    this.box(g, 0.3, 0.04, 0.22, -0.2, 0.47, 0.1, M(P.terracotta), 0.01, false);
    this.box(g, 0.28, 0.04, 0.2, -0.2, 0.51, 0.1, M(P.sageDark), 0.01, false).rotation.y = 0.3;
    this.cyl(g, 0.045, 0.04, 0.09, 0.2, 0.5, -0.1, M(P.cream), 12, false);
    this.collide(x, z, 1.2, 1.2);
  }

  bookshelf(x: number, z: number, ry: number, len: number): void {
    const g = this.group(x, z, ry);
    const wood = M(P.walnut, 0.7);
    this.box(g, len, 2.1, 0.04, 0, 1.05, -0.18, wood, 0.01);
    for (const s of [-1, 1]) this.box(g, 0.05, 2.1, 0.4, s * (len / 2 - 0.025), 1.05, 0, wood, 0.01);
    const r = rng(Math.floor(x * 7 + z * 13 + 3));
    const cols = [P.terracotta, P.sageDark, P.mustard, P.cream, P.evergreen, "#7b5d8a", "#3f6a8f"];
    for (let s = 0; s < 5; s++) {
      const y = 0.05 + s * 0.5;
      this.box(g, len, 0.04, 0.4, 0, y, 0, wood, 0.008);
      if (s === 4) continue;
      let px = -len / 2 + 0.12;
      while (px < len / 2 - 0.2) {
        const bw = 0.045 + r() * 0.05;
        const bh = 0.24 + r() * 0.17;
        if (r() > 0.88) {
          px += 0.22;
          continue;
        }
        const b = this.box(g, bw, bh, 0.24, px + bw / 2, y + 0.02 + bh / 2, 0.02, M(cols[Math.floor(r() * cols.length)], 0.8), 0.005, false);
        b.rotation.z = r() > 0.93 ? 0.18 : 0;
        px += bw + 0.008;
      }
    }
    this.collide(x, z, len, 0.4, ry);
  }

  plant(x: number, z: number, s = 1, tall = false): void {
    const g = this.group(x, z);
    this.cyl(g, 0.28 * s, 0.2 * s, 0.5 * s, 0, 0.25 * s, 0, M(P.pot, 0.7), 20);
    this.cyl(g, 0.26 * s, 0.26 * s, 0.03, 0, 0.5 * s, 0, M("#4a3a2c"), 16, false);
    const leaves = [M(P.leaf1, 0.75), M(P.leaf2, 0.75), M(P.leaf3, 0.75)];
    if (tall) {
      this.cyl(g, 0.035 * s, 0.05 * s, 1.1 * s, 0, 1.0 * s, 0, M(P.walnut), 8, false);
      const blobs: [number, number, number, number][] = [
        [0, 1.9, 0, 0.5], [0.3, 1.55, 0.12, 0.38], [-0.3, 1.6, -0.1, 0.4], [0.1, 1.3, 0.3, 0.3], [-0.12, 1.28, -0.28, 0.32], [0.22, 2.15, -0.1, 0.32],
      ];
      blobs.forEach(([bx, by, bz, br], i) => this.ball(g, br * s, bx * s, by * s, bz * s, leaves[i % 3], 2));
    } else {
      const blobs: [number, number, number, number][] = [[0, 0.85, 0, 0.34], [0.2, 0.72, 0.1, 0.24], [-0.2, 0.74, -0.08, 0.26], [0.05, 0.62, 0.22, 0.2]];
      blobs.forEach(([bx, by, bz, br], i) => this.ball(g, br * s, bx * s, by * s, bz * s, leaves[i % 3], 2));
    }
    this.collide(x, z, 0.6 * s, 0.6 * s);
  }

  floorLamp(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, 0.2, 0.2, 0.03, 0, 0.015, 0, M(P.charcoal, 0.4, 0.5));
    this.cyl(g, 0.016, 0.016, 1.5, 0, 0.78, 0, M(P.brass, 0.3, 0.8), 8, false);
    const shade = this.cyl(g, 0.2, 0.3, 0.36, 0, 1.68, 0, lampMat, 24, false);
    shade.userData.merge = true;
    this.collide(x, z, 0.4, 0.4);
  }

  roundTable(x: number, z: number, chairs: string[]): void {
    const g = this.group(x, z);
    this.cyl(g, 0.58, 0.58, 0.05, 0, 0.75, 0, M(P.oakLight), 32);
    this.cyl(g, 0.05, 0.05, 0.72, 0, 0.38, 0, M(P.charcoal, 0.5, 0.3), 10, false);
    this.cyl(g, 0.3, 0.32, 0.04, 0, 0.02, 0, M(P.charcoal, 0.5, 0.3), 20, false);
    this.cyl(g, 0.05, 0.045, 0.08, 0.15, 0.81, 0.1, M(P.cream), 12, false);
    this.collide(x, z, 1.2, 1.2);
    chairs.forEach((c, i) => {
      const a = (i / chairs.length) * Math.PI * 2 + Math.PI / 2;
      this.chair(x + Math.cos(a) * 0.95, z + Math.sin(a) * 0.95, -a - Math.PI / 2 + Math.PI, c);
    });
  }

  stool(x: number, z: number, color: string): void {
    const g = this.group(x, z);
    this.cyl(g, 0.22, 0.2, 0.07, 0, 0.74, 0, M(color, 0.85));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.cyl(g, 0.014, 0.014, 0.72, Math.cos(a) * 0.15, 0.36, Math.sin(a) * 0.15, M(P.brass, 0.3, 0.8), 6, false);
    }
    const ring = this.place(g, new THREE.TorusGeometry(0.16, 0.012, 6, 20), M(P.brass, 0.3, 0.8), 0, 0.3, 0, false);
    ring.rotation.x = Math.PI / 2;
  }

  bench(x: number, z: number, ry: number): void {
    const g = this.group(x, z, ry);
    this.box(g, 2.0, 0.1, 0.62, 0, 0.45, 0, M(P.oak), 0.04);
    this.box(g, 1.8, 0.07, 0.5, 0, 0.53, 0, M(P.sageDark, 0.9), 0.03, false);
    for (const s of [-1, 1]) this.box(g, 0.07, 0.42, 0.5, s * 0.85, 0.21, 0, M(P.walnut), 0.015, false);
    this.collide(x, z, 2.0, 0.62, ry);
  }

  commonsTree(x: number, z: number): void {
    const g = this.group(x, z);
    this.cyl(g, 1.0, 1.05, 0.5, 0, 0.25, 0, M(P.walnut, 0.7), 36);
    this.cyl(g, 0.88, 0.88, 0.04, 0, 0.5, 0, M("#4a3a2c"), 30, false);
    this.cyl(g, 0.07, 0.11, 1.5, 0, 1.2, 0, M("#5a3d2a"), 10, false);
    const leaves = [M(P.leaf1, 0.75), M(P.leaf2, 0.75), M(P.leaf3, 0.75)];
    const blobs: [number, number, number, number][] = [
      [0, 2.9, 0, 0.85], [0.7, 2.5, 0.2, 0.62], [-0.7, 2.55, -0.2, 0.66], [0.2, 2.35, 0.7, 0.55], [-0.2, 2.3, -0.72, 0.58],
      [0.5, 3.15, -0.4, 0.5], [-0.5, 3.1, 0.35, 0.5], [0, 2.1, 0, 0.6], [1.0, 2.1, -0.4, 0.4], [-1.0, 2.1, 0.4, 0.4],
    ];
    blobs.forEach(([bx, by, bz, br], i) => this.ball(g, br, bx, by, bz, leaves[i % 3], 2));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      this.ball(g, 0.2 + (i % 3) * 0.06, Math.cos(a) * 0.62, 0.62, Math.sin(a) * 0.62, leaves[(i + 1) % 3], 1, false);
    }
    this.collide(x, z, 2.1, 2.1);
  }

  meetingTable(x: number, z: number): void {
    const g = this.group(x, z);
    this.box(g, 4.4, 0.08, 1.5, 0, 0.75, 0, M(P.oakLight), 0.035);
    for (const s of [-1, 1]) this.box(g, 0.08, 0.72, 1.1, s * 1.7, 0.36, 0, M(P.charcoal, 0.5, 0.3), 0.02);
    this.box(g, 0.5, 0.012, 0.35, -1.0, 0.8, 0.2, M(P.charcoal, 0.4, 0.5), 0.005, false);
    this.cyl(g, 0.05, 0.045, 0.1, 0.4, 0.84, -0.2, M(P.cream), 12, false);
    this.cyl(g, 0.05, 0.045, 0.1, 1.0, 0.84, 0.25, M(P.cream), 12, false);
    this.collide(x, z, 4.4, 1.5);
    const cols = [P.sageDark, P.terracotta, P.sageDark, P.mustard, P.sageDark, P.terracotta];
    [-1.4, 0, 1.4].forEach((dx, i) => {
      this.chair(x + dx, z - 1.05, Math.PI, cols[i]);
      this.chair(x + dx, z + 1.05, 0, cols[i + 3]);
    });
    this.chair(x - 2.5, z, Math.PI / 2, P.mustard);
    this.chair(x + 2.5, z, -Math.PI / 2, P.mustard);
  }

  counter(x: number, z: number, len: number): void {
    const g = this.group(x, z);
    this.box(g, len, 1.0, 0.7, 0, 0.5, 0, M(P.evergreen, 0.7), 0.03);
    this.box(g, len + 0.2, 0.06, 0.86, 0, 1.03, 0.04, M(P.oakLight, 0.55), 0.025);
    const slats = Math.floor(len / 0.12);
    for (let i = 0; i < slats; i++) this.box(g, 0.07, 0.86, 0.025, -len / 2 + 0.1 + i * ((len - 0.2) / (slats - 1)), 0.48, 0.36, M(P.walnut, 0.65), 0.008, false);
    // coffee machine
    this.box(g, 0.7, 0.5, 0.5, len / 2 - 1.4, 1.31, -0.05, M(P.charcoal, 0.35, 0.5), 0.04);
    this.box(g, 0.72, 0.06, 0.52, len / 2 - 1.4, 1.58, -0.05, M(P.brass, 0.3, 0.8), 0.02, false);
    for (const s of [-0.18, 0.18]) this.cyl(g, 0.03, 0.03, 0.1, len / 2 - 1.4 + s, 1.2, 0.18, M(P.metal, 0.3, 0.8), 8, false);
    // cups and pastry domes
    for (let i = 0; i < 4; i++) this.cyl(g, 0.04, 0.035, 0.08, -len / 2 + 0.7 + i * 0.12, 1.1, 0.0, M(i % 2 ? P.cream : P.terracotta), 10, false);
    for (let i = 0; i < 2; i++) {
      this.cyl(g, 0.2, 0.2, 0.03, -len / 2 + 2.2 + i * 0.6, 1.08, 0.05, M(P.cream, 0.4), 20, false);
      const dome = this.ball(g, 0.17, -len / 2 + 2.2 + i * 0.6, 1.14, 0.05, M("#e9c48f", 0.7), 2, false);
      dome.scale.y = 0.6;
    }
    this.collide(x, z, len + 0.2, 0.86);
  }

  fridge(x: number, z: number): void {
    const g = this.group(x, z);
    this.box(g, 0.9, 1.9, 0.75, 0, 0.95, 0, M(P.metal, 0.35, 0.5), 0.04);
    this.box(g, 0.03, 0.5, 0.04, 0.34, 1.3, 0.4, M(P.charcoal, 0.4, 0.5), 0.01, false);
    this.box(g, 0.03, 0.3, 0.04, 0.34, 0.55, 0.4, M(P.charcoal, 0.4, 0.5), 0.01, false);
    this.box(g, 0.88, 0.012, 0.01, 0, 1.0, 0.38, M("#8d9692"), 0.004, false);
    this.collide(x, z, 0.9, 0.75);
  }

  // ----------------------------------------------------------------- merging

  /** Collapse all static meshes into one mesh per (material, shadow flags). */
  mergeStatics(): THREE.Group {
    this.root.updateMatrixWorld(true);
    const buckets = new Map<string, { mat: THREE.Material; cast: boolean; geos: THREE.BufferGeometry[] }>();
    const sources: THREE.Mesh[] = [];
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.userData.merge) sources.push(o as THREE.Mesh);
    });
    for (const m of sources) {
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()) as THREE.BufferGeometry;
      g.applyMatrix4(m.matrixWorld);
      for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
      const mat = m.material as THREE.Material;
      const key = `${mat.uuid}|${m.castShadow}`;
      let b = buckets.get(key);
      if (!b) {
        b = { mat, cast: m.castShadow, geos: [] };
        buckets.set(key, b);
      }
      b.geos.push(g);
      m.removeFromParent();
      m.geometry.dispose();
    }
    const out = new THREE.Group();
    buckets.forEach((b) => {
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      out.add(mesh);
    });
    this.root.add(out);
    return this.root;
  }
}

// ---------------------------------------------------------------------------

function decal(width: number, depth: number, x: number, z: number, map: THREE.Texture, opts: { opacity?: number; y?: number; ry?: number; color?: string } = {}): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    opacity: opts.opacity ?? 1,
    roughness: 0.95,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = opts.ry ?? 0;
  m.position.set(x, opts.y ?? 0.012, z);
  m.receiveShadow = true;
  return m;
}

function floorPatch(w: number, d: number, x: number, z: number, map: THREE.Texture, repeatPerMetre: number, y: number): THREE.Mesh {
  map.repeat.set(w * repeatPerMetre, d * repeatPerMetre);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function buildWorld(): World {
  const b = new Builder();
  const out = new THREE.Group();
  const W = 32;
  const D = 20;

  // ------------------------------------------------------------ floor + shell
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 0.7, D + 1.2), M("#7a5a3a", 0.9));
  slab.position.y = -0.36;
  slab.receiveShadow = true;
  out.add(slab);

  const floorTex = floorTexture();
  floorTex.repeat.set(W / 4, D / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.62 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  out.add(floor);

  const wallMat = M(P.wall, 0.9);
  const trim = M(P.trim, 0.7);
  // back wall
  b.box(b.root, W + 0.6, 3.4, 0.3, 0, 1.7, -D / 2 - 0.15, wallMat, 0.02);
  b.box(b.root, W, 0.14, 0.06, 0, 0.07, -D / 2 + 0.03, trim, 0.01, false);
  b.box(b.root, W + 0.6, 0.1, 0.38, 0, 3.4, -D / 2 - 0.15, trim, 0.02);
  // left wall
  b.box(b.root, 0.3, 3.4, D + 0.6, -W / 2 - 0.15, 1.7, 0, wallMat, 0.02);
  b.box(b.root, 0.06, 0.14, D, -W / 2 + 0.03, 0.07, 0, trim, 0.01, false);
  b.box(b.root, 0.38, 0.1, D + 0.6, -W / 2 - 0.15, 3.4, 0, trim, 0.02);
  // low parapets on the camera-facing sides
  b.box(b.root, 0.3, 0.9, D + 0.6, W / 2 + 0.15, 0.45, 0, wallMat, 0.03);
  b.box(b.root, 0.4, 0.07, D + 0.7, W / 2 + 0.15, 0.93, 0, trim, 0.03);
  const gap = 1.4;
  for (const s of [-1, 1]) {
    const len = W / 2 - gap + 0.3;
    b.box(b.root, len, 0.9, 0.3, s * (gap + len / 2), 0.45, D / 2 + 0.15, wallMat, 0.03);
    b.box(b.root, len, 0.07, 0.4, s * (gap + len / 2), 0.93, D / 2 + 0.15, trim, 0.03);
  }

  // wall colliders are handled by bounds; windows & sign
  const frameMat = trim;
  const addWindow = (x: number, z: number, ry: number) => {
    const g = b.group(x, z, ry);
    b.box(g, 2.5, 2.3, 0.12, 0, 1.95, 0, frameMat, 0.02, false);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.0), new THREE.MeshBasicMaterial({ map: windowTexture(Math.floor(x * 3 + z * 5 + 20)), toneMapped: false }));
    pane.position.set(0, 1.95, 0.065);
    out.add(pane);
    g.updateMatrix();
    pane.applyMatrix4(g.matrix);
    b.box(g, 0.06, 2.0, 0.08, 0, 1.95, 0.07, frameMat, 0.01, false);
    b.box(g, 2.2, 0.06, 0.08, 0, 1.95, 0.07, frameMat, 0.01, false);
    b.box(g, 2.7, 0.07, 0.3, 0, 0.78, 0.1, frameMat, 0.02, false);
  };
  for (const x of [-12, -6, 6, 12]) addWindow(x, -D / 2 + 0.07, 0);
  for (const z of [-0.5, 7.5]) addWindow(-W / 2 + 0.07, z, Math.PI / 2);

  // brand sign on the back wall
  const signTex = wordmarkTexture();
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.0), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false }));
  sign.position.set(0.7, 2.25, -D / 2 + 0.06);
  out.add(sign);
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 14, 40), brassGlow);
    ring.position.set(-2.55 + s * 0.27, 2.25, -D / 2 + 0.1);
    ring.castShadow = true;
    out.add(ring);
  }

  // ---------------------------------------------------------------- zones
  const zones: ZoneDef[] = [
    { id: "meeting", name: "Meeting room", x: -12, z: -6.5, w: 8, d: 7, private: true, color: "#4f8a7a" },
    { id: "focus", name: "Focus desks", x: 10.3, z: -6.3, w: 11.4, d: 7.4, private: false, color: "#7b8fb0" },
    { id: "lounge", name: "Lounge", x: -11.3, z: 6.2, w: 9.4, d: 7.6, private: false, color: "#c4764a" },
    { id: "cafe", name: "Café", x: 11.2, z: 6.2, w: 9.6, d: 7.6, private: false, color: "#d9a548" },
    { id: "commons", name: "The Commons", x: 0, z: 2, w: 40, d: 40, private: false, color: "#8aa391" },
  ];

  // ----------------------------------------------------------- floor patches
  const carpetMeet = floorPatch(8, 7, -12, -6.5, carpetTexture("#5f7d6b", 4), 1.2, 0.006);
  const carpetFocus = floorPatch(11.4, 7.4, 10.3, -6.3, carpetTexture("#7f97a3", 8), 1.2, 0.006);
  const tiles = floorPatch(9.6, 7.6, 11.2, 6.2, tileTexture(), 0.5, 0.006);
  out.add(carpetMeet, carpetFocus, tiles);
  out.add(decal(7.6, 7.6, 0, 3.2, roundRugTexture(), { y: 0.014 }));
  out.add(decal(6.2, 4.2, -11, 6.1, loungeRugTexture(), { y: 0.014 }));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ color: "#2e3532", roughness: 1 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.012, 9.3);
  mat.receiveShadow = true;
  out.add(mat);

  // floor lettering
  const label = (text: string, sub: string | undefined, x: number, z: number, w = 4.6, color = "#f4efe2", opacity = 0.7) =>
    out.add(decal(w, w / 4, x, z, labelTexture(text, sub, color), { opacity, y: 0.02 }));
  label("Meeting room", "Private · voices stay inside", -12, -3.85, 4.4, "#f4efe2", 0.7);
  label("Focus desks", "Quiet zone", 10.3, -2.95, 4.0, "#f4efe2", 0.7);
  label("Lounge", undefined, -11, 9.0, 3.2, "#2b4a3e", 0.6);
  label("Café", undefined, 11.2, 9.0, 2.6, "#4a3a22", 0.6);
  label("The Commons", "Talk to whoever is close", 0, -2.5, 4.4, "#2b4a3e", 0.62);

  // --------------------------------------------------------- meeting room
  const glass = new THREE.MeshStandardMaterial({ color: "#cfe9e0", roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.17, depthWrite: false });
  const glassPanel = (x: number, z: number, w: number, d: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.7, d), glass);
    m.position.set(x, 1.35, z);
    out.add(m);
    b.colliders.push({ x, z, w, d });
  };
  const rail = M(P.charcoal, 0.4, 0.5);
  glassPanel(-14.4, -3, 3.2, 0.08);
  glassPanel(-9.6, -3, 3.2, 0.08);
  glassPanel(-8, -6.5, 0.08, 7);
  b.box(b.root, 3.2, 0.06, 0.1, -14.4, 2.72, -3, rail, 0.01, false);
  b.box(b.root, 3.2, 0.06, 0.1, -9.6, 2.72, -3, rail, 0.01, false);
  b.box(b.root, 0.1, 0.06, 7, -8, 2.72, -6.5, rail, 0.01, false);
  b.box(b.root, 0.1, 0.06, 7, -8, 0.03, -6.5, rail, 0.01, false);
  for (const [px, pz] of [[-16, -3], [-12.8, -3], [-11.2, -3], [-8, -3], [-8, -6.5], [-8, -10]] as const) b.box(b.root, 0.1, 2.76, 0.1, px, 1.38, pz, rail, 0.01, false);
  b.box(b.root, 1.6, 0.06, 0.1, -12, 2.72, -3, rail, 0.01, false);
  // wall screen
  b.box(b.root, 3.4, 1.9, 0.08, -12, 1.75, -D / 2 + 0.05, M(P.charcoal, 0.4, 0.3), 0.02, false);
  b.box(b.root, 3.2, 1.7, 0.02, -12, 1.75, -D / 2 + 0.1, screenMat, 0.005, false);
  b.meetingTable(-12, -6.6);
  b.plant(-15.2, -9.0, 1.1, true);

  // ------------------------------------------------------------ focus desks
  const chairCols = [P.sageDark, P.terracotta, P.mustard, P.evergreen, P.sageDark, P.terracotta];
  [7.6, 10.8, 14.0].forEach((x, i) => {
    b.desk(x, -8.7, chairCols[i]);
    b.desk(x, -5.3, chairCols[i + 3]);
  });
  b.box(b.root, 3.2, 1.2, 0.06, 5.2, 1.6, -D / 2 + 0.05, M(P.cream, 0.4), 0.02, false);
  b.plant(15.2, -2.9, 1.0, true);
  b.plant(5.4, -9.3, 0.9);

  // ---------------------------------------------------------------- lounge
  b.sofa(-11, 4.2, 0, 3.0, P.sage, P.mustard);
  b.sofa(-14.4, 6.6, Math.PI / 2, 3.0, P.sageDark, P.terracotta);
  b.sofa(-8.2, 6.5, -Math.PI / 2, 1.5, P.mustard, P.cream);
  b.coffeeTable(-11, 6.5);
  b.bookshelf(-15.5, 3.2, Math.PI / 2, 2.8);
  b.floorLamp(-8.4, 3.2);
  b.plant(-15.1, 9.2, 1.0, true);
  b.plant(-7.1, 9.2, 0.9);

  // ------------------------------------------------------------------ café
  b.counter(11.8, 3.3, 6.8);
  b.fridge(15.35, 3.3);
  [9.0, 10.4, 11.8, 13.2].forEach((x, i) => b.stool(x, 4.5, i % 2 ? P.terracotta : P.mustard));
  b.roundTable(9.0, 7.6, [P.sageDark, P.terracotta, P.mustard]);
  b.roundTable(13.4, 7.7, [P.mustard, P.sageDark, P.terracotta]);
  b.plant(15.3, 9.1, 1.0, true);
  b.plant(6.9, 3.0, 0.9);

  // --------------------------------------------------------------- commons
  b.commonsTree(0, 3.2);
  b.bench(-4.1, 3.2, Math.PI / 2);
  b.bench(4.1, 3.2, Math.PI / 2);
  b.plant(-2.3, 9.2, 1.0, true);
  b.plant(2.3, 9.2, 1.0, true);
  b.plant(-5.8, -1.6, 0.9);
  b.plant(5.8, -1.6, 0.9);

  b.mergeStatics();
  out.add(b.root);

  const pois = {
    commons: [[-2.6, 1.2], [2.6, 1.2], [-2.6, 5.6], [2.6, 5.6], [0, 7.6], [-1.4, -0.9], [1.6, -1.0]] as [number, number][],
    lounge: [[-10, 8.0], [-12.3, 8.0], [-9.1, 5.3], [-12.9, 2.9], [-8.7, 8.2]] as [number, number][],
    cafe: [[11.4, 5.7], [8.2, 5.7], [14.6, 6.0], [11.2, 9.0], [7.0, 8.4]] as [number, number][],
    desks: [[7.6, -7.4], [10.8, -7.4], [14.0, -7.4], [7.6, -4.0], [10.8, -4.0], [14.0, -4.0]] as [number, number][],
    meeting: [[-12.8, -4.4], [-10.4, -4.6], [-14.8, -6.6], [-9.0, -8.6], [-12, -8.9]] as [number, number][],
  };

  return {
    root: out,
    colliders: b.colliders,
    zones,
    pois,
    bounds: { minX: -15.4, maxX: 15.4, minZ: -9.4, maxZ: 9.5 },
    spawn: [0, 8.3],
  };
}
