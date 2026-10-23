import { useEffect } from 'react';
import { AVATAR_RADIUS } from './constants';
import { clampToMap } from './utils';

// Module 3: drag YOUR avatar only.
// usersRef.current is A's shared user state, assumed to be Map<id, {id,name,color,x,y}>.
// The canvas internal size (canvas.width/height) is assumed to equal the map size.
export function useDragMovement({ canvasRef, usersRef, selfId, onMove, onDragEnd }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selfId) return undefined;

    let dragging = false;
    let pointerId = null;
    let offX = 0;
    let offY = 0;

    const toCanvas = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height),
      };
    };

    const onDown = (e) => {
      const self = usersRef.current.get(selfId);
      if (!self) return;
      const p = toCanvas(e);
      if (Math.hypot(p.x - self.x, p.y - self.y) > AVATAR_RADIUS) return;
      dragging = true;
      pointerId = e.pointerId;
      offX = p.x - self.x;
      offY = p.y - self.y;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };

    const onMoveEvt = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const self = usersRef.current.get(selfId);
      if (!self) return;
      const p = toCanvas(e);
      const pos = clampToMap(p.x - offX, p.y - offY);
      self.x = pos.x;
      self.y = pos.y;
      onMove?.(pos.x, pos.y);
    };

    const end = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      canvas.style.cursor = 'default';
      onDragEnd?.();
    };

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMoveEvt);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMoveEvt);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
    };
  }, [canvasRef, usersRef, selfId, onMove, onDragEnd]);
}