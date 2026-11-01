/**
 * The ProxiSpeak office door: a five-panel walnut door with reeded glass and
 * brass hardware, drawn procedurally so it needs no image files.
 *
 * Realism comes from SVG filters rather than flat fills:
 *  - woodV / woodH: turbulence, warped by a second low-frequency turbulence,
 *    mapped to a walnut colour ramp (vertical grain on stiles and panels,
 *    horizontal grain on rails, as on a real framed door).
 *  - relief: a height map (frame, beads, raised panel) lit by a distant light,
 *    blended over the wood so the mouldings catch light and cast shade.
 *  - reed: blurred glass content refracted through vertical turbulence.
 *
 * Geometry (viewBox 360 x 800): stiles 52 wide, glazed opening on top,
 * lock rail in the middle, raised panel below, handle on the right.
 */
import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const BAKE_W = 720;
const BAKE_H = 1600;

function DoorArt() {
  return (
    <svg
      className="door-art"
      viewBox="0 0 360 800"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      overflow="visible"
    >
      <defs>
        {/* ---------- Wood ---------- */}
        <filter id="pxs-wood-v" x="0" y="0" width="360" height="800" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0045 0.0016" numOctaves="2" seed="3" result="warp" />
          <feTurbulence type="fractalNoise" baseFrequency="0.16 0.0018" numOctaves="4" seed="11" result="fine" />
          <feDisplacementMap in="fine" in2="warp" scale="46" xChannelSelector="R" yChannelSelector="G" result="wavy" />
          <feColorMatrix
            in="wavy"
            type="matrix"
            values="2.0 0 0 0 -0.5  2.0 0 0 0 -0.5  2.0 0 0 0 -0.5  0 0 0 0 1"
            result="gray"
          />
          <feComponentTransfer in="gray">
            <feFuncR type="table" tableValues="0.17 0.27 0.40 0.50 0.58" />
            <feFuncG type="table" tableValues="0.095 0.16 0.24 0.31 0.37" />
            <feFuncB type="table" tableValues="0.05 0.09 0.14 0.19 0.23" />
          </feComponentTransfer>
        </filter>

        <filter id="pxs-wood-h" x="0" y="0" width="360" height="800" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.0016 0.0045" numOctaves="2" seed="8" result="warp" />
          <feTurbulence type="fractalNoise" baseFrequency="0.0018 0.16" numOctaves="4" seed="21" result="fine" />
          <feDisplacementMap in="fine" in2="warp" scale="40" xChannelSelector="G" yChannelSelector="R" result="wavy" />
          <feColorMatrix
            in="wavy"
            type="matrix"
            values="2.0 0 0 0 -0.5  2.0 0 0 0 -0.5  2.0 0 0 0 -0.5  0 0 0 0 1"
            result="gray"
          />
          <feComponentTransfer in="gray">
            <feFuncR type="table" tableValues="0.17 0.27 0.40 0.50 0.58" />
            <feFuncG type="table" tableValues="0.095 0.16 0.24 0.31 0.37" />
            <feFuncB type="table" tableValues="0.05 0.09 0.14 0.19 0.23" />
          </feComponentTransfer>
        </filter>

        {/* Height map -> directional light. Flat areas land on mid-grey so
            "overlay" leaves them untouched and only the mouldings change. */}
        <filter id="pxs-relief" x="0" y="0" width="360" height="800" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="height" />
          <feDiffuseLighting in="height" surfaceScale="3.6" diffuseConstant="1" lightingColor="#ffffff">
            <feDistantLight azimuth="235" elevation="30" />
          </feDiffuseLighting>
        </filter>

        {/* Soft drop shadow for hardware. */}
        <filter id="pxs-hardware-shadow" x="-40%" y="-40%" width="180%" height="190%">
          <feDropShadow dx="1.5" dy="3" stdDeviation="2.2" floodColor="#0b0603" floodOpacity="0.55" />
        </filter>

        {/* Reeded glass: blur the warm light, then bend it through vertical flutes. */}
        <filter id="pxs-reed" x="66" y="74" width="228" height="258" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="9" result="soft" />
          <feTurbulence type="turbulence" baseFrequency="0.088 0" numOctaves="1" seed="2" result="flutes" />
          <feDisplacementMap in="soft" in2="flutes" scale="30" xChannelSelector="R" yChannelSelector="A" />
        </filter>

        {/* ---------- Clips ---------- */}
        <clipPath id="pxs-rails">
          <rect x="52" y="0" width="256" height="60" />
          <rect x="52" y="346" width="256" height="106" />
          <rect x="52" y="736" width="256" height="64" />
        </clipPath>
        <clipPath id="pxs-glass">
          <rect x="66" y="74" width="228" height="258" rx="2" />
        </clipPath>

        {/* ---------- Gradients ---------- */}
        <linearGradient id="pxs-ambient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd08a" stopOpacity="0.34" />
          <stop offset="0.3" stopColor="#ffd08a" stopOpacity="0.06" />
          <stop offset="0.62" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.46" />
        </linearGradient>
        <linearGradient id="pxs-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.38" />
          <stop offset="0.07" stopColor="#000" stopOpacity="0" />
          <stop offset="0.9" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id="pxs-ao-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0402" stopOpacity="0.2" />
          <stop offset="1" stopColor="#0a0402" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pxs-ao-left" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a0402" stopOpacity="0.18" />
          <stop offset="1" stopColor="#0a0402" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pxs-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a6a34" />
          <stop offset="0.22" stopColor="#f2deaa" />
          <stop offset="0.5" stopColor="#c19a55" />
          <stop offset="0.74" stopColor="#f6e7bb" />
          <stop offset="1" stopColor="#8a6a34" />
        </linearGradient>
        <linearGradient id="pxs-brass-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6c4f26" />
          <stop offset="0.28" stopColor="#f0d99f" />
          <stop offset="0.55" stopColor="#bd9550" />
          <stop offset="0.82" stopColor="#f3e2b4" />
          <stop offset="1" stopColor="#6c4f26" />
        </linearGradient>
        <radialGradient id="pxs-rose" cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#f8e8bd" />
          <stop offset="0.45" stopColor="#c59c58" />
          <stop offset="1" stopColor="#6b4d23" />
        </radialGradient>
        <linearGradient id="pxs-glass-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9bb" />
          <stop offset="0.55" stopColor="#f6c883" />
          <stop offset="1" stopColor="#d9954b" />
        </linearGradient>
        <linearGradient id="pxs-flute-cell" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#140a02" stopOpacity="0.05" />
          <stop offset="1" stopColor="#140a02" stopOpacity="0.36" />
        </linearGradient>
        <pattern id="pxs-flutes" x="66" y="0" width="11.4" height="20" patternUnits="userSpaceOnUse">
          <rect width="11.4" height="20" fill="url(#pxs-flute-cell)" />
        </pattern>
        <linearGradient id="pxs-glass-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.28" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ---------- Hinge barrels (on the frame side) ---------- */}
      {[70, 380, 690].map((y) => (
        <g key={y} filter="url(#pxs-hardware-shadow)">
          <rect x="0" y={y} width="7" height="46" rx="3" fill="url(#pxs-brass-h)" />
          <rect x="0" y={y + 21} width="7" height="1.2" fill="#3b2a12" opacity="0.55" />
        </g>
      ))}

      {/* ---------- Wood: vertical grain everywhere, horizontal on the rails ---------- */}
      <rect width="360" height="800" filter="url(#pxs-wood-v)" />
      <g clipPath="url(#pxs-rails)">
        <rect width="360" height="800" filter="url(#pxs-wood-h)" />
      </g>

      {/* ---------- Joints between stiles and rails ---------- */}
      <g fill="none" strokeLinecap="square">
        {[
          [0, 60],
          [346, 452],
          [736, 800],
        ].map(([y1, y2]) => (
          <g key={y1}>
            <path d={`M52 ${y1}V${y2}M308 ${y1}V${y2}`} stroke="#150a04" strokeOpacity="0.7" strokeWidth="1.2" />
            <path d={`M53.2 ${y1}V${y2}M309.2 ${y1}V${y2}`} stroke="#d9a76b" strokeOpacity="0.22" strokeWidth="0.8" />
          </g>
        ))}
      </g>

      {/* ---------- Moulding relief (light and shade) ---------- */}
      <g style={{ mixBlendMode: "overlay" }}>
        <g filter="url(#pxs-relief)">
          {/* Frame at full height, with the two openings cut out. */}
          <path
            fillRule="evenodd"
            fill="#fff"
            d="M0 0H360V800H0Z M52 60H308V346H52Z M52 452H308V736H52Z"
          />
          {/* Bead around the glass. */}
          <path fillRule="evenodd" fill="#fff" fillOpacity="0.72" d="M52 60H308V346H52Z M66 74H294V332H66Z" />
          {/* Raised field of the lower panel. */}
          <rect x="68" y="468" width="224" height="252" rx="1" fill="#fff" fillOpacity="0.58" />
          {/* Fine ridge inside the raised field. */}
          <rect x="86" y="486" width="188" height="216" rx="1" fill="#fff" fillOpacity="0.2" />
        </g>
      </g>

      {/* ---------- Ambient occlusion in the recessed openings ---------- */}
      <rect x="52" y="452" width="256" height="20" fill="url(#pxs-ao-top)" />
      <rect x="52" y="452" width="20" height="284" fill="url(#pxs-ao-left)" />
      <rect x="52" y="736" width="256" height="1" fill="#0a0402" opacity="0.5" />

      {/* ---------- Reeded glass with two warm shapes behind it ---------- */}
      <g clipPath="url(#pxs-glass)">
        <g>
          <rect x="66" y="74" width="228" height="258" fill="url(#pxs-glass-bg)" />
          <g filter="url(#pxs-reed)">
            <circle cx="150" cy="214" r="66" fill="#fff4d6" style={{ mixBlendMode: "screen" }} />
            <circle cx="212" cy="226" r="66" fill="#ffc977" style={{ mixBlendMode: "screen" }} />
          </g>
        </g>
        <rect x="66" y="74" width="228" height="258" fill="url(#pxs-flutes)" />
        <rect x="66" y="74" width="228" height="258" fill="url(#pxs-glass-sheen)" />
        <rect x="66" y="74" width="228" height="22" fill="url(#pxs-ao-top)" opacity="0.7" />
      </g>
      <rect x="66.5" y="74.5" width="227" height="257" rx="2" fill="none" stroke="#0e0603" strokeOpacity="0.75" />
      <rect x="64.5" y="72.5" width="231" height="261" rx="3" fill="none" stroke="#e6c48a" strokeOpacity="0.3" />

      {/* ---------- Ridge line on the raised panel ---------- */}
      <rect x="68.5" y="468.5" width="223" height="251" fill="none" stroke="#120804" strokeOpacity="0.3" />
      <rect x="69.5" y="469.5" width="221" height="249" fill="none" stroke="#e0b27a" strokeOpacity="0.14" />

      {/* ---------- Name plate ---------- */}
      <g filter="url(#pxs-hardware-shadow)">
        <rect x="112" y="381" width="136" height="36" rx="2.5" fill="url(#pxs-brass)" />
        <rect x="113" y="382" width="134" height="34" rx="2" fill="none" stroke="#fff5d2" strokeOpacity="0.5" />
        <circle cx="120" cy="399" r="2.1" fill="#6d4f24" />
        <circle cx="240" cy="399" r="2.1" fill="#6d4f24" />
      </g>

      {/* ---------- Deadbolt ---------- */}
      <g filter="url(#pxs-hardware-shadow)">
        <circle cx="334" cy="470" r="14" fill="url(#pxs-rose)" />
        <circle cx="334" cy="470" r="9.5" fill="url(#pxs-brass)" />
        <circle cx="334" cy="470" r="9.5" fill="none" stroke="#4d3817" strokeOpacity="0.7" />
        <path d="M334 465.4a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Zm-1.2 3.6h2.4l.8 5.2h-4Z" fill="#1b1006" />
      </g>

      {/* ---------- Lever handle ---------- */}
      <g filter="url(#pxs-hardware-shadow)">
        <circle cx="334" cy="399" r="16.5" fill="url(#pxs-rose)" />
        <circle cx="334" cy="399" r="12" fill="none" stroke="#fff2c4" strokeOpacity="0.55" />
        <circle cx="334" cy="399" r="16.5" fill="none" stroke="#4d3817" strokeOpacity="0.6" />
        <g>
          <rect x="268" y="393" width="72" height="12" rx="6" fill="url(#pxs-brass)" />
          <rect x="268.5" y="393.5" width="71" height="11" rx="5.5" fill="none" stroke="#4d3817" strokeOpacity="0.55" />
          <circle cx="334" cy="399" r="8" fill="url(#pxs-rose)" />
        </g>
      </g>

      {/* ---------- Overall light and shade ---------- */}
      <rect width="360" height="800" fill="url(#pxs-ambient)" pointerEvents="none" />
      <rect width="360" height="800" fill="url(#pxs-side)" pointerEvents="none" />
    </svg>
  );
}

/**
 * Draws the door once, then shows it as a plain bitmap.
 *
 * The SVG filters (grain, relief lighting, glass refraction) are expensive. Left
 * live, the browser re-runs them while the door rotates and the page stutters.
 * Baked into a canvas, the swing is just the GPU turning a texture.
 */
export default function OfficeDoor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const markup = renderToStaticMarkup(<DoorArt />).replace(
      "<svg ",
      `<svg xmlns="http://www.w3.org/2000/svg" width="${BAKE_W}" height="${BAKE_H}" `
    );

    const image = new Image();
    image.onload = async () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, BAKE_W, BAKE_H);

      // Engraved name on the brass plate (needs the web font, so it is drawn here).
      try {
        await Promise.race([
          document.fonts.load('800 32px "Manrope"'),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {
        /* fall back to the system font */
      }
      if (cancelled) return;
      ctx.font = '800 32px Manrope, "DM Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0.8px";
      ctx.fillStyle = "rgba(255, 243, 203, 0.75)";
      ctx.fillText("ProxiSpeak", 360, 812 + 1.8);
      ctx.fillStyle = "#4a3515";
      ctx.fillText("ProxiSpeak", 360, 812);
      canvas.dataset.ready = "true";
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

    return () => {
      cancelled = true;
    };
  }, []);

  return <canvas ref={canvasRef} className="door-art" width={BAKE_W} height={BAKE_H} aria-hidden="true" />;
}
