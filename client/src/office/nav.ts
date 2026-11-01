import type { Collider } from "./world";

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Does a circle at (x, z) overlap any collider? */
export function hitsAny(x: number, z: number, r: number, colliders: Collider[]): boolean {
  for (const c of colliders) {
    const cx = Math.max(c.x - c.w / 2, Math.min(x, c.x + c.w / 2));
    const cz = Math.max(c.z - c.d / 2, Math.min(z, c.z + c.d / 2));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

/**
 * Move a circle by (dx, dz), sliding along obstacles: each axis is resolved
 * separately so walking into a wall at an angle keeps you moving along it.
 */
export function moveWithCollision(pos: { x: number; z: number }, dx: number, dz: number, r: number, colliders: Collider[], b: Bounds): void {
  const nx = Math.min(b.maxX, Math.max(b.minX, pos.x + dx));
  if (!hitsAny(nx, pos.z, r, colliders)) pos.x = nx;
  const nz = Math.min(b.maxZ, Math.max(b.minZ, pos.z + dz));
  if (!hitsAny(pos.x, nz, r, colliders)) pos.z = nz;
}

const CELL = 0.4;

/** A* over a coarse occupancy grid of the floor plan. */
export class NavGrid {
  private readonly nx: number;
  private readonly nz: number;
  private readonly blocked: Uint8Array;
  private readonly g: Float32Array;
  private readonly from: Int32Array;
  private readonly closed: Uint8Array;

  constructor(private readonly b: Bounds, private readonly colliders: Collider[], private readonly radius: number) {
    this.nx = Math.ceil((b.maxX - b.minX) / CELL) + 1;
    this.nz = Math.ceil((b.maxZ - b.minZ) / CELL) + 1;
    const n = this.nx * this.nz;
    this.blocked = new Uint8Array(n);
    this.g = new Float32Array(n);
    this.from = new Int32Array(n);
    this.closed = new Uint8Array(n);
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const [x, z] = this.toWorld(i, j);
        if (hitsAny(x, z, radius, colliders)) this.blocked[j * this.nx + i] = 1;
      }
    }
  }

  private toCell(x: number, z: number): [number, number] {
    return [
      Math.min(this.nx - 1, Math.max(0, Math.round((x - this.b.minX) / CELL))),
      Math.min(this.nz - 1, Math.max(0, Math.round((z - this.b.minZ) / CELL))),
    ];
  }

  private toWorld(i: number, j: number): [number, number] {
    return [this.b.minX + i * CELL, this.b.minZ + j * CELL];
  }

  /** Nearest open cell to a world point (spiral search). */
  nearestOpen(x: number, z: number): [number, number] | null {
    const [ci, cj] = this.toCell(x, z);
    for (let r = 0; r < 14; r++) {
      let best: [number, number] | null = null;
      let bestD = Infinity;
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
          if (this.blocked[j * this.nx + i]) continue;
          const [wx, wz] = this.toWorld(i, j);
          const d = (wx - x) ** 2 + (wz - z) ** 2;
          if (d < bestD) {
            bestD = d;
            best = [i, j];
          }
        }
      }
      if (best) return this.toWorld(best[0], best[1]);
    }
    return null;
  }

  private lineClear(x0: number, z0: number, x1: number, z1: number): boolean {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.ceil(dist / (CELL * 0.5));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      if (hitsAny(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, this.radius * 0.9, this.colliders)) return false;
    }
    return true;
  }

  /** Waypoints from start to target (excluding start), or null if unreachable. */
  findPath(sx: number, sz: number, tx: number, tz: number): [number, number][] | null {
    const target = this.nearestOpen(tx, tz);
    if (!target) return null;
    const [ex, ez] = target;
    if (this.lineClear(sx, sz, ex, ez)) return [[ex, ez]];

    const start = this.nearestOpen(sx, sz);
    if (!start) return null;
    const [si, sj] = this.toCell(start[0], start[1]);
    const [ei, ej] = this.toCell(ex, ez);
    const nx = this.nx;
    const startIdx = sj * nx + si;
    const endIdx = ej * nx + ei;

    this.g.fill(Infinity);
    this.closed.fill(0);
    this.from.fill(-1);
    this.g[startIdx] = 0;

    const open: number[] = [startIdx];
    const f = new Map<number, number>();
    const h = (i: number, j: number) => Math.hypot(i - ei, j - ej);
    f.set(startIdx, h(si, sj));

    let found = false;
    let guard = 0;
    while (open.length && guard++ < 20000) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if ((f.get(open[k]) ?? 0) < (f.get(open[bi]) ?? 0)) bi = k;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === endIdx) {
        found = true;
        break;
      }
      this.closed[cur] = 1;
      const ci = cur % nx;
      const cj = (cur - ci) / nx;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di;
          const nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= nx || nj >= this.nz) continue;
          const n = nj * nx + ni;
          if (this.blocked[n] || this.closed[n]) continue;
          if (di && dj && (this.blocked[cj * nx + ni] || this.blocked[nj * nx + ci])) continue;
          const ng = this.g[cur] + (di && dj ? 1.414 : 1);
          if (ng < this.g[n]) {
            this.g[n] = ng;
            this.from[n] = cur;
            f.set(n, ng + h(ni, nj));
            if (!open.includes(n)) open.push(n);
          }
        }
      }
    }
    if (!found) return null;

    const cells: [number, number][] = [];
    for (let c = endIdx; c !== -1; c = this.from[c]) {
      const ci = c % nx;
      cells.push(this.toWorld(ci, (c - ci) / nx));
    }
    cells.reverse();

    // String-pulling: keep only the corners we actually need.
    const path: [number, number][] = [];
    let ax = sx;
    let az = sz;
    let idx = 0;
    while (idx < cells.length) {
      let far = idx;
      for (let k = cells.length - 1; k > idx; k--) {
        if (this.lineClear(ax, az, cells[k][0], cells[k][1])) {
          far = k;
          break;
        }
      }
      path.push(cells[far]);
      ax = cells[far][0];
      az = cells[far][1];
      idx = far + 1;
    }
    return path;
  }
}
