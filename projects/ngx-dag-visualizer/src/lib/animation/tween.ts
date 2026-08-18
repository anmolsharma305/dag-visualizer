import { easeInOutCubic, EasingFn } from './easing';

export interface TweenConfig {
  duration: number;
  easing?: EasingFn;
  onUpdate: (progress: number) => void;
  onComplete?: () => void;
}

export interface TweenHandle {
  cancel(): void;
  readonly active: boolean;
}

export function tween(config: TweenConfig): TweenHandle {
  const easing = config.easing ?? easeInOutCubic;
  let raf = 0;
  let cancelled = false;
  let active = true;

  const finish = (progress: number) => {
    active = false;
    config.onUpdate(progress);
    if (!cancelled) {
      config.onComplete?.();
    }
  };

  if (typeof requestAnimationFrame === 'undefined' || config.duration <= 0) {
    finish(1);
    return {
      cancel() {
        cancelled = true;
        active = false;
      },
      get active() {
        return active && !cancelled;
      },
    };
  }

  const start = performance.now();
  const tick = (now: number) => {
    if (cancelled) {
      return;
    }
    const t = Math.min(1, (now - start) / config.duration);
    config.onUpdate(easing(t));
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      active = false;
      config.onComplete?.();
    }
  };
  raf = requestAnimationFrame(tick);

  return {
    cancel() {
      cancelled = true;
      active = false;
      cancelAnimationFrame(raf);
    },
    get active() {
      return active && !cancelled;
    },
  };
}
