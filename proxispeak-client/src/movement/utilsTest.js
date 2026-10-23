import { describe, it, expect, vi } from 'vitest';
import { clamp, clampToMap, throttle } from './utils';
import { MAP_WIDTH, MAP_HEIGHT, AVATAR_RADIUS } from './constants';

describe('clampToMap', () => {
  it('keeps the avatar fully inside the map', () => {
    expect(clampToMap(-50, -50)).toEqual({ x: AVATAR_RADIUS, y: AVATAR_RADIUS });
    expect(clampToMap(99999, 99999)).toEqual({ x: MAP_WIDTH - AVATAR_RADIUS, y: MAP_HEIGHT - AVATAR_RADIUS });
  });
  it('leaves valid positions unchanged', () => {
    expect(clampToMap(300, 200)).toEqual({ x: 300, y: 200 });
  });
});

describe('clamp', () => {
  it('limits to range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});

describe('throttle', () => {
  it('limits calls and always delivers the last value', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle(fn, 50);
    t(1); t(2); t(3);
    expect(fn).toHaveBeenCalledTimes(1);      // leading call only
    expect(fn).toHaveBeenLastCalledWith(1);
    vi.advanceTimersByTime(60);
    expect(fn).toHaveBeenCalledTimes(2);      // trailing call with the latest value
    expect(fn).toHaveBeenLastCalledWith(3);
    vi.useRealTimers();
  });
  it('flush sends the pending value immediately', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const t = throttle(fn, 50);
    t(1); t(2);
    t.flush();
    expect(fn).toHaveBeenLastCalledWith(2);
    vi.useRealTimers();
  });
});
