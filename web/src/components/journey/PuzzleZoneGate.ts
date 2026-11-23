import { clamp } from "./mathUtils";
import { PUZZLE_ZONE_RAW_SPAN, PUZZLE_ZONE_SIM_SPAN, PUZZLE_ZONE_START } from "@/lib/journey-data";

/**
 * Progress (0..1) per second. Kept low enough that even the worst case —
 * an instant flick straight through the zone — still produces a walk speed
 * well under CharacterAnimator's idle threshold, so the character actually
 * reads as stopped rather than merely "slower." A full traversal takes at
 * least ~20s on such a flick; normal gradual scrolling is unaffected by
 * this cap (it only binds when scroll massively outpaces it).
 */
const MAX_ZONE_RATE = 0.05;

export function puzzleZoneRawEnd() {
  return PUZZLE_ZONE_START + PUZZLE_ZONE_RAW_SPAN;
}

/**
 * Rate-limits how fast the mechanism/pattern/branch sequence can advance by
 * real time, not by scroll distance — so a fast flick through this stretch
 * still plays out at a deliberate pace instead of snapping straight through,
 * while slow/normal scrolling tracks it closely. Fully reversible: scrolling
 * back out decays progress the same way it grew.
 */
export class PuzzleZoneGate {
  progress = 0;

  update(raw: number, dt: number): number {
    const desired = clamp((raw - PUZZLE_ZONE_START) / PUZZLE_ZONE_RAW_SPAN, 0, 1);
    const maxStep = MAX_ZONE_RATE * dt;
    this.progress += clamp(desired - this.progress, -maxStep, maxStep);
    return this.progress;
  }
}

/**
 * Converts raw scroll-distance into the simulated world position, with the
 * whole examination sequence compressed into PUZZLE_ZONE_SIM_SPAN of actual
 * walking distance — this is what makes the character stop (barely any
 * worldX change means barely any walk-animation speed) while scroll still
 * drives the puzzle's own animation.
 */
export function simFromRaw(raw: number, zoneProgress: number): number {
  if (raw <= PUZZLE_ZONE_START) return raw;
  const tail = Math.max(0, raw - puzzleZoneRawEnd());
  return PUZZLE_ZONE_START + zoneProgress * PUZZLE_ZONE_SIM_SPAN + tail;
}
