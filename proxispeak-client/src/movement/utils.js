import { MAP_WIDTH, MAP_HEIGHT, AVATAR_RADIUS } from './constants';

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export const clampToMap = (x, y) => ({
  x: clamp(x, AVATAR_RADIUS, MAP_WIDTH - AVATAR_RADIUS),
  y: clamp(y, AVATAR_RADIUS, MAP_HEIGHT - AVATAR_RADIUS),
});

// Leading + trailing throttle: first call goes out immediately and the LAST
// position is always delivered, so remote avatars end exactly where you stopped.
export function throttle(fn, intervalMs) {
  let last = 0;
  let timer = null;
  let pending = null;

  const run = (args) => {
    last = Date.now();
    timer = null;
    pending = null;
    fn(...args);
  };

  const throttled = (...args) => {
    const wait = intervalMs - (Date.now() - last);
    if (wait <= 0) {
      if (timer) clearTimeout(timer);
      run(args);
    } else {
      pending = args;
      if (!timer) timer = setTimeout(() => run(pending), wait);
    }
  };
  throttled.flush = () => { if (timer) { clearTimeout(timer); run(pending); } };
  throttled.cancel = () => { if (timer) clearTimeout(timer); timer = null; pending = null; };
  return throttled;
}