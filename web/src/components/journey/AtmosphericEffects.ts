import { Sprite, Texture } from "pixi.js";

// Bake the fog and lens falloff into a small texture once. Linear sampling
// keeps both gradients soft as the stage is resized.
export function createAtmosphericEffects() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 216;
  const ctx = canvas.getContext("2d")!;
  const fog = ctx.createLinearGradient(0, 130, 0, 200);
  fog.addColorStop(0, "rgba(192,203,193,0)");
  fog.addColorStop(0.61, "rgba(192,203,193,0.08)");
  fog.addColorStop(1, "rgba(192,203,193,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, 384, 216);
  const vignette = ctx.createRadialGradient(210, 121, 70, 207, 117, 239);
  vignette.addColorStop(0, "rgba(7,14,21,0)");
  vignette.addColorStop(1, "rgba(7,14,21,0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 384, 216);
  return { container: new Sprite(Texture.from(canvas)) };
}

export type AtmosphericEffects = ReturnType<typeof createAtmosphericEffects>;

export function resizeAtmosphericEffects(effects: AtmosphericEffects, width: number, height: number) {
  effects.container.setSize(width, height);
}
