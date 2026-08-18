export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutBack: EasingFn = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const EASINGS = { linear, easeInCubic, easeOutCubic, easeInOutCubic, easeOutBack };

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
