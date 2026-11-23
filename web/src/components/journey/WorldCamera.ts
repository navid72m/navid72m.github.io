import { clamp } from "./mathUtils";

/** Screen pixels of ground per unit of biography progress. */
export const GROUND_SCALE = 0.34;
export const MAX_WALK_SPEED = 125;
const MAX_ACCEL = 950;
const CATCH_UP_TIME = 0.055;

export class WorldCamera {
  worldX = 0;
  velocity = 0;

  update(targetWorldX: number, dt: number) {
    if (dt <= 0) return this;
    const gap = targetWorldX - this.worldX;
    const step = Math.abs(gap) < 0.1 ? gap : gap * -Math.expm1(-dt / CATCH_UP_TIME);
    this.worldX += step;

    // A flick scrubs the scenery. Only the walking part of that distance
    // drives the skeleton, so a large seek cannot queue minutes of footsteps.
    const walkSpeed = clamp(step * GROUND_SCALE / dt, -MAX_WALK_SPEED, MAX_WALK_SPEED);
    this.velocity += clamp(walkSpeed - this.velocity, -MAX_ACCEL * dt, MAX_ACCEL * dt);
    return this;
  }
}
