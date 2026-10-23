// Temporary harness to build and test Module 3 on its own (no backend, no Member A code).
// Delete it once A's real canvas and shared user state are merged.
import { useCallback, useEffect, useRef } from 'react';
import { MAP_WIDTH, MAP_HEIGHT, AVATAR_RADIUS } from './constants';
import { useDragMovement } from './useDragMovement';

const SELF_ID = 'me';

export default function DragDemo() {
  const canvasRef = useRef(null);
  // Same shape A will provide: Map<id, {id, name, color, x, y}>
  const usersRef = useRef(new Map([
    ['me', { id: 'me', name: 'Abhi', color: '#2563eb', x: 200, y: 200 }],
    ['other', { id: 'other', name: 'Other', color: '#dc2626', x: 500, y: 300 }],
  ]));

  const onMove = useCallback((x, y) => console.log('move', Math.round(x), Math.round(y)), []);
  const onDragEnd = useCallback(() => console.log('drag end'), []);

  useDragMovement({ canvasRef, usersRef, selfId: SELF_ID, onMove, onDragEnd });

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d'); <div className=""></div>
    let raf;
    const draw = () => {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let hudY = 20;
      for (const u of usersRef.current.values()) {
        // avatar
        ctx.beginPath();
        ctx.arc(u.x, u.y, AVATAR_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = u.color;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(u.name[0].toUpperCase(), u.x, u.y);

        // coordinates read from the shared user state, shown under the avatar
        ctx.fillStyle = '#111827';
        ctx.font = '12px sans-serif';
        ctx.fillText(`(${Math.round(u.x)}, ${Math.round(u.y)})`, u.x, u.y + AVATAR_RADIUS + 12);

        // live readout, top left
        ctx.textAlign = 'left';
        ctx.fillText(`${u.name}: x=${Math.round(u.x)}  y=${Math.round(u.y)}`, 12, hudY);
        ctx.textAlign = 'center';
        hudY += 18;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      style={{ width: '100%', maxWidth: MAP_WIDTH, border: '1px solid #ccc', display: 'block' }}
    />
  );
}