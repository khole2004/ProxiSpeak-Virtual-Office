import * as THREE from "three";

/**
 * Procedural textures, painted once into canvases at start-up. They become
 * ordinary GPU bitmaps, so they cost nothing per frame.
 */

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

function canvas(w: number, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function tex(c: HTMLCanvasElement, repeat = false, aniso = 8): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return `#${c.getHexString()}`;
}

/** Light oak boards, 4 m x 4 m per tile. */
export function floorTexture(): THREE.CanvasTexture {
  const size = 2048;
  const [c, g] = canvas(size);
  const r = rng(7);
  const rows = 16;
  const rowH = size / rows;
  const base = ["#cfa874", "#c79f6b", "#d6b283", "#c39a66", "#d2ac7b"];
  for (let row = 0; row < rows; row++) {
    let x = -r() * 700;
    while (x < size) {
      const len = 420 + r() * 700;
      const col = base[Math.floor(r() * base.length)];
      g.fillStyle = shade(col, (r() - 0.5) * 0.04);
      g.fillRect(x, row * rowH, len, rowH);
      // grain
      for (let i = 0; i < 16; i++) {
        const gy = row * rowH + r() * rowH;
        g.strokeStyle = r() > 0.5 ? "rgba(90,55,25,0.09)" : "rgba(255,235,200,0.1)";
        g.lineWidth = 0.6 + r() * 1.2;
        g.beginPath();
        g.moveTo(x, gy);
        const wob = (r() - 0.5) * 5;
        g.bezierCurveTo(x + len * 0.3, gy + wob, x + len * 0.65, gy - wob, x + len, gy + wob * 0.4);
        g.stroke();
      }
      // knots
      if (r() > 0.88) {
        const kx = x + len * (0.2 + r() * 0.6);
        const ky = row * rowH + rowH * 0.5;
        const grad = g.createRadialGradient(kx, ky, 1, kx, ky, 14);
        grad.addColorStop(0, "rgba(80,45,20,0.4)");
        grad.addColorStop(1, "rgba(80,45,20,0)");
        g.fillStyle = grad;
        g.fillRect(kx - 16, ky - 16, 32, 32);
      }
      // end seam
      g.fillStyle = "rgba(60,35,15,0.4)";
      g.fillRect(x, row * rowH, 2.5, rowH);
      g.fillStyle = "rgba(255,240,215,0.25)";
      g.fillRect(x + 2.5, row * rowH, 1.5, rowH);
      x += len;
    }
    g.fillStyle = "rgba(60,35,15,0.38)";
    g.fillRect(0, row * rowH, size, 2.5);
    g.fillStyle = "rgba(255,240,215,0.22)";
    g.fillRect(0, row * rowH + 2.5, size, 1.5);
  }
  return tex(c, true, 16);
}

/** Speckled carpet, optionally with a woven stripe. */
export function carpetTexture(color: string, seed = 3): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  const r = rng(seed);
  g.fillStyle = color;
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return tex(c, true, 4);
}

/** Cafe floor: sage and cream tiles with grout. */
export function tileTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  const n = 4;
  const s = 512 / n;
  const r = rng(11);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? "#e8e0cc" : "#a9bfae";
      g.fillRect(x * s, y * s, s, s);
      g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
      g.fillRect(x * s, y * s, s, s / 2);
    }
  }
  g.strokeStyle = "rgba(70,80,70,0.45)";
  g.lineWidth = 3;
  for (let i = 0; i <= n; i++) {
    g.beginPath();
    g.moveTo(i * s, 0);
    g.lineTo(i * s, 512);
    g.moveTo(0, i * s);
    g.lineTo(512, i * s);
    g.stroke();
  }
  return tex(c, true, 8);
}

/** Round woven rug for the commons. */
export function roundRugTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024);
  const r = rng(5);
  const cx = 512;
  g.clearRect(0, 0, 1024, 1024);
  const ring = (rad: number, col: string) => {
    g.beginPath();
    g.arc(cx, cx, rad, 0, Math.PI * 2);
    g.fillStyle = col;
    g.fill();
  };
  ring(510, "#24412f");
  ring(492, "#e8dfc7");
  ring(470, "#8aa391");
  ring(400, "#e8dfc7");
  ring(386, "#2b4a3e");
  ring(330, "#6f8f7b");
  ring(250, "#e8dfc7");
  ring(236, "#c4764a");
  ring(150, "#e8dfc7");
  // woven dashes on the outer band
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 415, cx + Math.sin(a) * 415);
    g.lineTo(cx + Math.cos(a) * 455, cx + Math.sin(a) * 455);
    g.stroke();
  }
  // fibre noise
  const img = g.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const n = (r() - 0.5) * 20;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return tex(c, false, 8);
}

/** Rectangular lounge rug. */
export function loungeRugTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 704);
  const r = rng(9);
  g.fillStyle = "#e9e0c8";
  g.fillRect(0, 0, 1024, 704);
  g.fillStyle = "#c4764a";
  g.fillRect(36, 36, 952, 632);
  g.fillStyle = "#e9e0c8";
  g.fillRect(56, 56, 912, 592);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 2 ? "#8aa391" : "#2b4a3e";
    g.fillRect(90 + i * 94, 90, 74, 524);
  }
  for (let i = 0; i < 9; i++) {
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(90 + i * 94 + 28, 90, 16, 524);
  }
  const img = g.getImageData(0, 0, 1024, 704);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return tex(c, false, 8);
}

/** Floor lettering, painted into the boards like a wayfinding sign. */
export function labelTexture(text: string, sub?: string, color = "#f4efe2"): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 256);
  g.clearRect(0, 0, 1024, 256);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = color;
  g.font = '800 104px Manrope, "DM Sans", sans-serif';
  g.fillText(text, 512, sub ? 108 : 128);
  if (sub) {
    g.font = '600 44px "DM Sans", sans-serif';
    g.globalAlpha = 0.85;
    g.fillText(sub, 512, 196);
  }
  return tex(c, false, 8);
}

/** Wall sign: "ProxiSpeak" in brass-white letters on transparent. */
export function wordmarkTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1536, 320);
  g.clearRect(0, 0, 1536, 320);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = '800 190px Manrope, "DM Sans", sans-serif';
  g.fillStyle = "#f4efe2";
  const w1 = g.measureText("Proxi").width;
  const w2 = g.measureText("Speak").width;
  const x0 = 768 - (w1 + w2) / 2;
  g.textAlign = "left";
  g.fillText("Proxi", x0, 168);
  g.fillStyle = "#e8c98a";
  g.font = '500 190px Manrope, "DM Sans", sans-serif';
  g.fillText("Speak", x0 + w1, 168);
  return tex(c, false, 8);
}

/** A soft daylight view for the back-wall windows. */
export function windowTexture(seed: number): THREE.CanvasTexture {
  const [c, g] = canvas(256, 384);
  const r = rng(seed);
  const sky = g.createLinearGradient(0, 0, 0, 384);
  sky.addColorStop(0, "#bfe0ee");
  sky.addColorStop(0.55, "#eaf1e4");
  sky.addColorStop(1, "#f7ecc9");
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 384);
  for (let i = 0; i < 14; i++) {
    const x = r() * 256;
    const y = 250 + r() * 130;
    const rad = 40 + r() * 70;
    const grad = g.createRadialGradient(x, y, 4, x, y, rad);
    const col = r() > 0.5 ? "96,150,100" : "70,125,90";
    grad.addColorStop(0, `rgba(${col},0.85)`);
    grad.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 384);
  }
  const sun = g.createRadialGradient(190, 70, 4, 190, 70, 120);
  sun.addColorStop(0, "rgba(255,248,214,0.95)");
  sun.addColorStop(1, "rgba(255,248,214,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, 256, 384);
  return tex(c, false, 4);
}

/** Radial glow used for the proximity ring on the floor. */
export function proximityTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512);
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, "rgba(232,201,138,0.0)");
  grad.addColorStop(0.55, "rgba(232,201,138,0.06)");
  grad.addColorStop(0.9, "rgba(232,201,138,0.22)");
  grad.addColorStop(0.955, "rgba(255,236,190,0.85)");
  grad.addColorStop(0.985, "rgba(232,201,138,0.2)");
  grad.addColorStop(1, "rgba(232,201,138,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  return tex(c, false, 4);
}

export function rippleTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256);
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,226,160,0)");
  grad.addColorStop(0.8, "rgba(255,226,160,0)");
  grad.addColorStop(0.93, "rgba(255,226,160,0.9)");
  grad.addColorStop(1, "rgba(255,226,160,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return tex(c, false, 4);
}
