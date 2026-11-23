import { clamp, lerp } from "./mathUtils";
import { MAX_WALK_SPEED } from "./WorldCamera";
import type { Proportions } from "./CharacterGrowthController";

/** World px per full left-right-left gait cycle at strideScale = 1 (adult). One cycle contains two steps. */
const STRIDE_LENGTH_BASE = 146;

/** Below this speed (world px/sec) the character is considered stopped. */
const IDLE_SPEED_EPSILON = 10;

/** Seconds: how quickly the walk<->idle blend reacts to speed changes. */
const INTENSITY_SMOOTH_TIME = 0.085;

const HIP_SWING_AMPLITUDE = 0.48;
const KNEE_BASE_BEND = 0.10;
const KNEE_SWING_AMPLITUDE = 0.68;
const ARM_SWING_RATIO = 0.42 / HIP_SWING_AMPLITUDE;
const ELBOW_BEND_AMPLITUDE = 0.35;
const HEAD_SWAY_AMPLITUDE = 1.1;
const IDLE_SWAY_AMPLITUDE = 0.05;
const IDLE_SWAY_PERIOD = 2.8;
const LEAN_WALK_PX = 40;

export interface Pose {
  phase: number;
  walkBlend: number;
  facing: 1 | -1;
  headSwayX: number;
  leanX: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
  leftFootPitch: number;
  rightFootPitch: number;
  breath: number;
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
}

/** Accumulate strides with the current leg length so growth never resets the gait. */
export class CharacterAnimator {
  private phase = 0;
  private intensity = 0;
  private facing: 1 | -1 = 1;
  private clock = 0;

  update(velocity: number, proportions: Proportions, dt: number): Pose {
    this.clock += dt;

    const maxSpeed = MAX_WALK_SPEED * proportions.strideScale;
    const speed = Math.min(Math.abs(velocity), maxSpeed);
    const targetIntensity = clamp(speed / maxSpeed, 0, 1);
    const smoothing = 1 - Math.exp(-dt / INTENSITY_SMOOTH_TIME);
    this.intensity = lerp(this.intensity, targetIntensity, smoothing);

    if (speed > IDLE_SPEED_EPSILON) {
      this.facing = velocity > 0 ? 1 : -1;
    }

    const strideLength = STRIDE_LENGTH_BASE * proportions.strideScale;
    this.phase = (this.phase + speed * dt / strideLength) % 1;
    const phase = this.phase;
    const theta = phase * Math.PI * 2;

    const hipSwing = Math.sin(theta) * HIP_SWING_AMPLITUDE * this.intensity;
    const kneeSwingL = Math.max(0, Math.sin(theta - 0.82)) * KNEE_SWING_AMPLITUDE * this.intensity;
    const kneeSwingR = Math.max(0, Math.sin(theta + Math.PI - 0.82)) * KNEE_SWING_AMPLITUDE * this.intensity;
    const elbowL = Math.max(0, Math.sin(theta + Math.PI)) * ELBOW_BEND_AMPLITUDE * this.intensity;
    const elbowR = Math.max(0, Math.sin(theta)) * ELBOW_BEND_AMPLITUDE * this.intensity;

    const idleSway = Math.sin((this.clock * Math.PI * 2) / IDLE_SWAY_PERIOD) * IDLE_SWAY_AMPLITUDE * (1 - this.intensity);

    return {
      phase,
      walkBlend: this.intensity,
      facing: this.facing,
      // Toe rises on approach, then the heel lifts as weight leaves the foot.
      leftFootPitch: Math.sin(theta) * 0.25 * this.intensity,
      rightFootPitch: -Math.sin(theta) * 0.25 * this.intensity,
      breath: Math.sin(this.clock * 1.65) * (1 - this.intensity),
      headSwayX: Math.sin(theta) * HEAD_SWAY_AMPLITUDE * this.intensity,
      leanX: proportions.postureLean * LEAN_WALK_PX * this.intensity,
      leftHip: hipSwing + idleSway + 0.065 * (1 - this.intensity),
      rightHip: -hipSwing + idleSway - 0.045 * (1 - this.intensity),
      leftKnee: KNEE_BASE_BEND + kneeSwingL,
      rightKnee: KNEE_BASE_BEND + kneeSwingR,
      leftShoulder: -hipSwing * ARM_SWING_RATIO,
      rightShoulder: hipSwing * ARM_SWING_RATIO,
      leftElbow: elbowL,
      rightElbow: elbowR,
    };
  }
}
