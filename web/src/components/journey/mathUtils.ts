export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Always-positive modulo. */
export const wrap = (value: number, range: number) => ((value % range) + range) % range;

/** Byte-wise RGB lerp between two 0xRRGGBB colors. */
export const lerpColor = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
};

export interface Keyframe<T> {
  t: number;
  value: T;
}

/** Finds the segment around `t` and smoothstep-interpolates between its two keyframes using `lerpFn`. */
export function keyframeLerp<T>(keyframes: Keyframe<T>[], t: number, lerpFn: (a: T, b: T, u: number) => T): T {
  let a = keyframes[0];
  let b = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
      a = keyframes[i];
      b = keyframes[i + 1];
      break;
    }
  }
  const span = b.t - a.t;
  const localT = span > 0 ? smoothstep((t - a.t) / span) : 0;
  return lerpFn(a.value, b.value, localT);
}
