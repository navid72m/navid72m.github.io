import { lerp, smoothstep } from "./mathUtils";

export interface Proportions {
  heightScale: number;
  /** Head height as a fraction of the full-grown character's height. */
  headHeightScale: number;
  legRatio: number;
  armRatio: number;
  shoulderWidthRatio: number;
  strideScale: number;
  postureLean: number;
}

interface Keyframe {
  t: number;
  p: Proportions;
}

/** Milestones along the biography, interpolated between ages. */
const KEYFRAMES: Keyframe[] = [
  {
    t: 0,
    p: {
      heightScale: 0.55,
      headHeightScale: 0.10,
      legRatio: 0.445,
      armRatio: 0.38,
      shoulderWidthRatio: 0.255,
      strideScale: 0.55,
      postureLean: 0.03,
    },
  },
  {
    t: 0.25,
    p: {
      heightScale: 0.85,
      headHeightScale: 0.135,
      legRatio: 0.495,
      armRatio: 0.42,
      shoulderWidthRatio: 0.27,
      strideScale: 0.8,
      postureLean: 0.015,
    },
  },
  {
    t: 0.52,
    p: {
      heightScale: 1.0,
      headHeightScale: 0.155,
      legRatio: 0.505,
      armRatio: 0.405,
      shoulderWidthRatio: 0.3,
      strideScale: 1.0,
      postureLean: 0.0,
    },
  },
];

const PROPORTION_KEYS = Object.keys(KEYFRAMES[0].p) as (keyof Proportions)[];

export class CharacterGrowthController {
  getProportions(journeyProgress: number): Proportions {
    const t = Math.min(KEYFRAMES[KEYFRAMES.length - 1].t, Math.max(0, journeyProgress));

    let a = KEYFRAMES[0];
    let b = KEYFRAMES[KEYFRAMES.length - 1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (t >= KEYFRAMES[i].t && t <= KEYFRAMES[i + 1].t) {
        a = KEYFRAMES[i];
        b = KEYFRAMES[i + 1];
        break;
      }
    }

    const span = b.t - a.t;
    const localT = span > 0 ? smoothstep((t - a.t) / span) : 0;

    const result = {} as Proportions;
    for (const key of PROPORTION_KEYS) {
      result[key] = lerp(a.p[key], b.p[key], localT);
    }
    return result;
  }
}
