export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Overshoots slightly past 1 before settling — gives a springy "pop". */
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The angle equivalent to `to` that is closest to `from`, so turns take the short way round. */
export function nearestAngle(from: number, to: number): number {
  const full = Math.PI * 2;
  let delta = (to - from) % full;
  if (delta > Math.PI) delta -= full;
  if (delta < -Math.PI) delta += full;
  return from + delta;
}

interface Tween {
  start: number;
  duration: number;
  step: (t: number) => void;
}

/** Keyed tweens driven by the render loop. Starting a tween with an existing key replaces it. */
export class Tweens {
  private active = new Map<string, Tween>();

  run(key: string, duration: number, step: (t: number) => void): void {
    this.active.set(key, { start: performance.now(), duration, step });
  }

  update(now = performance.now()): void {
    for (const [key, tween] of this.active) {
      const t = Math.min(1, (now - tween.start) / tween.duration);
      tween.step(t);
      if (t >= 1) this.active.delete(key);
    }
  }
}
