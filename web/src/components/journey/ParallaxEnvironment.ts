import { Container, Graphics, Text } from "pixi.js";
import { clamp, keyframeLerp, lerp, lerpColor } from "./mathUtils";
import { CHAPTERS, GLOBAL_WORLD_DISTANCE, LANDMARKS } from "@/lib/journey-data";
import { trailY } from "./JourneyTerrain";
import { GROUND_SCALE } from "./WorldCamera";

function mulberry32(seed: number) {
  let s = seed;
  return function random() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface TiledLayer {
  container: Container;
  factor: number;
}

export interface ParallaxEnvironment {
  back: Container;
  foreground: Container;
  distantAtmosphere: TiledLayer;
  farSilhouettes: TiledLayer;
  midground: TiledLayer;
  ground: TiledLayer;
  foregroundLayer: TiledLayer;
  groundY: number;
  anchorX: number;
  height: number;
  computationCells: { g: Graphics; seed: number }[];
  gateway?: { glow: Graphics; worldX: number };
  monument?: { container: Container; label: Text };
}

const ENTERPRISE = CHAPTERS.find((chapter) => chapter.id === "enterprise")!;

const GROUND_COLOR = 0x14161c;
const GROUND_TICK_COLOR = 0x2d3038;
const FOREGROUND_COLOR = 0x1b2021;

const FAR_NATURAL = 0x64747a;
const FAR_STRUCTURED = 0x596b75;
const MID_NATURAL = 0x37494d;
const MID_STRUCTURED = 0x394950;

const WARM_GLOW = 0xe8b873;
const CYAN_GLOW = 0x7fd9e0;
const RED_WARNING = 0xc24c3f;

/**
 * How "organic forest" (0) vs "built/technological" (1) the world should
 * look at a given world position. A single continuous curve across the
 * whole journey — this is what makes trees gradually become columns and
 * columns gradually become server/graph structures, with no hard cuts.
 */
const STRUCTURE_KEYFRAMES = [
  { t: 0, value: 0.0 },
  { t: 4000, value: 0.04 },
  { t: 8500, value: 0.15 },
  { t: 14000, value: 0.42 },
  { t: 18500, value: 0.5 },
  { t: 24000, value: 0.75 },
  { t: 29500, value: 0.92 },
  { t: 33500, value: 0.78 },
  { t: GLOBAL_WORLD_DISTANCE, value: 0.65 },
];

function structureAmountAt(worldX: number) {
  return keyframeLerp(STRUCTURE_KEYFRAMES, worldX, lerp);
}

/** A single shape family that drifts from a tapered tree silhouette (topRatio ~0.16) to a column/building (topRatio ~0.5). */
function motifPoints(localX: number, groundY: number, w: number, h: number, topRatio: number) {
  return [
    localX - w / 2, groundY,
    localX + w / 2, groundY,
    localX + w * topRatio, groundY - h,
    localX - w * topRatio, groundY - h,
  ];
}

// Irregular tiers stay connected to a bent central trunk. The same seed gives
// each tree the same contour when the browser window changes size.
function pine(g: Graphics, x: number, y: number, w: number, h: number, rand: () => number, color: number) {
  const lean = (rand() - 0.5) * w * 0.27;
  g.poly([x - w * 0.055, y, x + w * 0.065, y, x + lean, y - h]).fill(color);
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 0; k < 13; k++) {
      const t = (k + rand() * 0.5) / 13;
      const length = w * (0.5 - 0.45 * t) * (0.75 + rand() * 0.32);
      const base = y - h * (0.15 + 0.80 * t);
      const cx = x + lean * t;
      const points = [cx - side * w * 0.04, base - h * (0.13 - 0.07 * t)];
      for (let n = 9; n > 0; n--) {
        const f = n / 9;
        points.push(cx + side * length * f, base + h * (0.02 * rand() + 0.10 * f - 0.13 * f * f + (n % 2) * 0.024));
      }
      points.push(cx - side * w * 0.04, base);
      g.poly(points).fill(color);
    }
  }
}

function bareTree(g: Graphics, x: number, y: number, w: number, h: number, rand: () => number, color: number) {
  // Forks share their start with the parent tip, so thin twigs stay
  // attached even on the most crooked trunks.
  function branch(bx: number, by: number, dx: number, dy: number, radius: number, depth: number) {
    const tx = bx + dx;
    const ty = by + dy;
    const mx = bx + dx * 0.44 + (rand() - 0.5) * w * 0.08;
    const my = by + dy * 0.46;
    g.moveTo(bx - radius, by).quadraticCurveTo(mx - radius * 0.64, my, tx, ty)
      .quadraticCurveTo(mx + radius * 0.64, my, bx + radius, by).fill(color);
    if (depth > 0) {
      branch(mx, my, dx * 0.29, dy * (0.60 + rand() * 0.34), radius * 0.48, depth - 1);
      branch(tx, ty, dx * (0.38 + rand() * 0.44), dy * 0.48, radius * 0.38, depth - 1);
    }
  }

  let bx = x;
  let by = y;
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const dx = (rand() - 0.5) * w * 0.16;
    const dy = -h / 7;
    const radius = w * 0.054 * (1 - t);
    g.poly([bx - radius, by, bx + radius, by, bx + dx + radius * 0.84, by + dy, bx + dx - radius * 0.84, by + dy]).fill(color);
    bx += dx;
    by += dy;
    if (i > 0) {
      const reach = (i % 2 ? 1 : -1) * w * (1 - t) * (0.5 + rand() * 0.45);
      branch(bx, by, reach, -h * (0.12 + rand() * 0.10), radius * 0.8, 2);
    }
  }
}

function buildAmbientLayer(
  container: Container,
  seed: number,
  spacing: number,
  factor: number,
  naturalColor: number,
  structuredColor: number,
  heightRange: [number, number],
  widthRange: [number, number],
  groundY: number,
  viewport: number,
) {
  const padding = Math.ceil(viewport / (spacing * factor)) + 1;
  const count = Math.ceil(GLOBAL_WORLD_DISTANCE / spacing) + padding;
  for (let i = -padding; i < count; i++) {
    const rand = mulberry32(seed + i * 7919);
    const worldX = (i + rand() * 0.8) * spacing;
    const structure = structureAmountAt(clamp(worldX, 0, GLOBAL_WORLD_DISTANCE));
    const overlook = clamp((worldX - 33500) / 3200, 0, 1);
    const h = lerp(heightRange[0], heightRange[1], rand()) * (1 - 0.58 * overlook);
    const w = lerp(widthRange[0], widthRange[1], rand());
    const cool = lerpColor(naturalColor, structuredColor, structure);
    const warm = lerpColor(cool, 0x5c483c, 0.58);
    const color = lerpColor(warm, cool, clamp((worldX - 17500) / 2700, 0, 1));
    const x = worldX * factor;
    const g = new Graphics();
    g.alpha = 0.8;
    if (rand() > structure) {
      const drawTree = rand() > 0.45 ? pine : bareTree;
      drawTree(g, x, groundY, w, h, rand, color);
    } else {
      const roof = groundY - h * 0.85;
      g.poly(motifPoints(x, groundY, w * 0.7, groundY - roof, 0.49)).fill(color);
      g.rect(x - w * 0.17, roof - h * 0.045, w * 0.26, h * 0.05).fill(color);
      g.rect(x + w * 0.04, roof - h * 0.11, 1.4, h * 0.11).fill(color);
      for (let j = 1; j < 5; j++) {
        g.rect(x - w * 0.26, roof + j * h * 0.14, w * 0.48, 1.5).fill({ color: 0xb1bebe, alpha: 0.14 });
      }
    }
    container.addChild(g);
  }
}

function buildGroundStrip(container: Container, height: number, width: number) {
  const base = new Graphics();
  const end = GLOBAL_WORLD_DISTANCE * GROUND_SCALE + width;
  const points = [-width, height * 2];
  for (let x = -width; x < end; x += 10) {
    points.push(x, trailY(x / GROUND_SCALE, height));
  }
  points.push(end, trailY(end / GROUND_SCALE, height), end, height * 2);
  base.poly(points).fill(GROUND_COLOR);
  const rand = mulberry32(71);
  for (let x = -width; x < end; x += 8 + rand() * 12) {
    const groundY = trailY(x / GROUND_SCALE, height);
    const h = 1 + rand() ** 3 * 7;
    base.poly([x - 3, groundY + 1, x + 2, groundY - h, x, groundY + 1]).fill(GROUND_COLOR);
    if (rand() < 0.15) {
      base.ellipse(x, groundY + 3 + rand() * 12, 2 + rand() * 7, 0.8).fill(GROUND_TICK_COLOR);
    }
  }
  container.addChild(base);
}

function buildWaysideGrasses(layer: TiledLayer, height: number, width: number) {
  const rand = mulberry32(97);
  const tufts = new Graphics();
  const end = GLOBAL_WORLD_DISTANCE * layer.factor + width;
  for (let x = -width; x < end; x += 65 + rand() * 170) {
    const y = trailY(x / layer.factor, height) + 3;
    const spread = 7 + rand() * 14;
    for (let n = 0; n < 6; n++) {
      const root = x + rand() * spread;
      const tip = root + (rand() - 0.45) * spread;
      const h = 3 + rand() * 13;
      tufts.moveTo(root - 1.7, y).quadraticCurveTo(root, y - h * 0.6, tip, y - h)
        .quadraticCurveTo(root + 2.1, y - h * 0.4, root + 1.4, y).fill(FOREGROUND_COLOR);
    }
  }
  layer.container.addChild(tufts);
}

function drawGlow(g: Graphics, localX: number, cy: number, color: number, maxRadius: number, alphaStep: number) {
  g.clear();
  for (let r = maxRadius; r > 0; r -= maxRadius / 5) {
    g.circle(localX, cy, r).fill({ color, alpha: alphaStep });
  }
}

/** The far skyline + lit windows for "2016 — Quiz of Kings": distant buildings, data flowing in. */
function buildCitySkyline(container: Container, worldX: number, factor: number, groundY: number, height: number) {
  const rand = mulberry32(401);
  const localBase = worldX * factor;
  for (let i = 0; i < 8; i++) {
    const x = localBase + (i - 3.5) * 54;
    const h = height * (0.18 + rand() * 0.27);
    const w = 50 + rand() * 20;
    const g = new Graphics();
    g.rect(x - w / 2, groundY - h, w, h).fill({ color: 0x334149, alpha: 1 });
    container.addChild(g);
    const roof = groundY - h;
    g.rect(x - w * 0.24, roof - 8, w * 0.36, 9).fill(0x334149);
    g.rect(x + 2, roof - 21, 1.3, 21).fill(0x334149);
    for (let wy = roof + 12; wy < groundY - 8; wy += 14) {
      for (let wx = x - w / 2 + 7; wx < x + w / 2 - 6; wx += 10) {
        const lit = rand();
        g.rect(wx, wy, 4, 5).fill({ color: lit > 0.7 ? WARM_GLOW : CYAN_GLOW, alpha: lit > 0.7 ? 0.55 : 0.09 });
      }
    }
  }
}

// A departure canopy marks the move for graduate study. Its sign stays
// attached to the architecture as the visitor passes beneath it.
function buildDepartureCanopy(container: Container, x: number, base: number, height: number) {
  const y = base - height * 0.40;
  const canopy = new Graphics();
  canopy.poly([x - 190, y + 2, x + 171, y - 10, x + 159, y + 1, x - 180, y + 11]).fill(0x303b40);
  for (const dx of [-143, 134]) {
    canopy.rect(x + dx, y + 3, 5, base - y).fill(0x344147);
    canopy.moveTo(x + dx + 2, y + 37).lineTo(x + dx + 30, y + 1).stroke({ color: 0x344147, width: 3 });
  }
  canopy.rect(x - 111, y + 9, 2, 16).rect(x + 54, y + 4, 2, 21).fill(0x50595a);
  canopy.roundRect(x - 126, y + 25, 202, 39, 3).fill(0x273239);
  canopy.rect(x - 125, y + 25, 200, 2).fill(0xb6a281);
  const route = new Text({ text: "Tehran   →   Munich", style: { fontFamily: "Georgia, serif", fontSize: 19, fill: 0xe4d5b9 } });
  route.anchor.set(0.5);
  route.position.set(x - 25, y + 45);
  container.addChild(canopy, route);
}

/** A long bridge/corridor silhouette with a few device-like shapes, marking the move into Munich. */
function buildMunichBridge(container: Container, worldX: number, factor: number, groundY: number, height: number) {
  const localBase = worldX * factor;
  const deckY = groundY - height * 0.4;
  const deck = new Graphics();
  deck.rect(localBase - 420, deckY, 840, 14).fill({ color: 0x20242d, alpha: 0.75 });
  deck.rect(localBase - 420, deckY - 9, 840, 2).fill(0x36444b);
  for (let dx = -420; dx < 420; dx += 15) {
    deck.rect(localBase + dx, deckY - 9, 1.5, 10).fill(0x36444b);
  }
  for (let dx = -360; dx < 360; dx += 180) {
    const x = localBase + dx;
    deck.moveTo(x, deckY + 64).quadraticCurveTo(x + 88, deckY - 28, x + 180, deckY + 64)
      .stroke({ width: 6, color: 0x35444b });
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      deck.rect(x + t * 180, deckY + 13, 2, Math.max(1, 51 - 184 * t * (1 - t))).fill(0x35444b);
    }
  }
  container.addChild(deck);
  for (let i = -2; i <= 2; i++) {
    const px = localBase + i * 180;
    const pylon = new Graphics();
    pylon.rect(px - 7, deckY, 14, groundY - deckY).fill({ color: 0x1a1d24, alpha: 0.75 });
    container.addChild(pylon);
    const device = new Graphics();
    device.roundRect(px - 10, deckY - 20, 20, 16, 3).fill({ color: 0x2a3f46, alpha: 0.8 });
    device.circle(px, deckY - 12, 2.5).fill({ color: CYAN_GLOW, alpha: 0.7 });
    container.addChild(device);
  }
}

/** A large abstract node-and-edge graph silhouette, standing in for vecdb. */
function buildVectorGraph(container: Container, worldX: number, factor: number, groundY: number, height: number) {
  const rand = mulberry32(503);
  const localBase = worldX * factor;
  const baseY = groundY - height * 0.16;
  const crownY = groundY - height * 0.48;
  const frame = new Graphics();
  frame.poly([localBase - 24, groundY, localBase - 7, baseY, localBase + 7, baseY, localBase + 24, groundY]).fill(0x34444a);
  container.addChild(frame);
  const nodes: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const nx = localBase + Math.sin(angle) * (74 + rand() * 25);
    const ny = lerp(baseY, crownY, 0.5 + 0.5 * Math.cos(angle));
    nodes.push([nx, ny]);
  }
  const lines = new Graphics();
  for (let i = 0; i < nodes.length; i++) {
    const next = nodes[(i + 1) % nodes.length];
    lines.moveTo(nodes[i][0], nodes[i][1]).lineTo(next[0], next[1]);
    if (i % 2 === 0) {
      const alt = nodes[(i + 3) % nodes.length];
      lines.moveTo(nodes[i][0], nodes[i][1]).lineTo(alt[0], alt[1]);
    }
  }
  lines.stroke({ color: 0x95d4d2, width: 1.8, alpha: 0.82 });
  container.addChild(lines);
  for (const [nx, ny] of nodes) {
    const node = new Graphics();
    node.circle(nx, ny, 5).fill(0x405a61).circle(nx, ny, 2.6).fill(0xa5dedc);
    container.addChild(node);
  }
}

/** A grid of cells whose alpha is gently re-randomized over time — "a changing computational matrix." */
function buildComputationMatrix(container: Container, worldX: number, factor: number, groundY: number, height: number): { g: Graphics; seed: number }[] {
  const localBase = worldX * factor;
  const cols = 6;
  const rows = 5;
  const cellSize = 16;
  const originX = localBase - (cols * cellSize) / 2;
  const originY = groundY - height * 0.43;
  const housing = new Graphics();
  housing.rect(originX - 9, originY - 12, cols * cellSize + 16, groundY - originY + 12).fill(0x2e3b43);
  for (let y = originY + rows * cellSize + 16; y < groundY - 12; y += 7) {
    housing.rect(originX + 4, y, cols * cellSize - 10, 2).fill(0x45555c);
  }
  container.addChild(housing);
  const cells: { g: Graphics; seed: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const g = new Graphics();
      g.rect(originX + c * cellSize, originY + r * cellSize, cellSize - 2, cellSize - 2).fill(CYAN_GLOW);
      container.addChild(g);
      cells.push({ g, seed: r * cols + c });
    }
  }
  return cells;
}

/** Two pylons + a beam the character walks through, with a dormant red-warning indicator. */
function buildSecurityGateway(container: Container, worldX: number, factor: number, groundY: number, height: number): { glow: Graphics; worldX: number } {
  const localBase = worldX * factor;
  const gateHeight = height * 0.43;
  const frame = new Graphics();
  frame.rect(localBase - 70, groundY - gateHeight, 10, gateHeight).fill({ color: 0x1c2026, alpha: 0.9 });
  frame.rect(localBase + 60, groundY - gateHeight, 10, gateHeight).fill({ color: 0x1c2026, alpha: 0.9 });
  frame.rect(localBase - 70, groundY - gateHeight, 140, 10).fill({ color: 0x1c2026, alpha: 0.9 });
  frame.roundRect(localBase + 52, groundY - gateHeight + 11, 23, 36, 3).fill(0x29343b);
  for (let i = 0; i < 5; i++) {
    frame.rect(localBase - 49 + i * 22, groundY - gateHeight + 3, 12, 2).fill(0x667779);
  }
  container.addChild(frame);

  const glow = new Graphics();
  const lampX = localBase + 63;
  const lampY = groundY - gateHeight + 23;
  drawGlow(glow, lampX, lampY, RED_WARNING, 30, 0.11);
  glow.circle(lampX, lampY, 4).fill(0xff8c76);
  glow.alpha = 0;
  container.addChild(glow);
  return { glow, worldX };
}

/** A tower of database-table blocks, with a version label that changes as the visitor passes through. */
function buildEnterpriseMonument(localBase: number, groundY: number, height: number) {
  const container = new Container();
  const tiers = 7;
  const tierHeight = (height * 0.49) / tiers;
  const spine = new Graphics();
  spine.rect(localBase - 20, groundY - tiers * tierHeight, 40, tiers * tierHeight).fill(0x33434c);
  container.addChild(spine);
  for (let i = 0; i < tiers; i++) {
    const w = 90 - i * 6;
    const y = groundY - (i + 1) * tierHeight;
    const g = new Graphics();
    g.rect(localBase - w / 2, y, w, tierHeight - 3).fill({ color: 0x1e222b, alpha: 0.9 });
    for (let vent = 0; vent < 5; vent++) {
      g.rect(localBase - w / 2 + 7 + vent * 4, y + tierHeight * 0.62, 1.5, tierHeight * 0.18).fill(0x47535a);
    }
    g.circle(localBase + w / 2 - 9, y + tierHeight * 0.7, 1.7).fill(CYAN_GLOW);
    g.rect(localBase - w / 2 + 4, y + tierHeight * 0.4, w - 8, 2).fill({ color: 0x3a4250, alpha: 0.6 });
    container.addChild(g);
  }
  const label = new Text({
    text: "Odoo 17",
    style: { fill: 0xf2eee0, fontSize: 19, fontFamily: "Georgia, serif", letterSpacing: 1 },
  });
  label.anchor.set(0.5, 1);
  label.position.set(localBase, groundY - tiers * tierHeight - 8);
  container.addChild(label);
  return { container, label };
}

/** Faint, small echoes of earlier landmarks, far in the background near the end of the walk. */
function buildOverlookEcho(container: Container, worldX: number, factor: number, groundY: number, height: number) {
  const localBase = worldX * factor;
  const echo = new Container();
  // A distant shelf of the skyline, bridge, graph, matrix, gate and tower.
  const g = new Graphics();
  const color = 0x485d65;
  const y = groundY - height * 0.22;
  for (let i = 0; i < 5; i++) {
    const h = [23, 39, 29, 47, 32][i];
    g.rect(-197 + i * 12, y - h, 11, h).fill(color);
  }
  g.rect(-127, y - 19, 66, 3).fill(color);
  for (let i = 0; i < 4; i++) g.rect(-125 + i * 20, y - 18, 2, 18).fill(color);
  g.moveTo(-46, y - 21).lineTo(-29, y - 36).lineTo(-18, y - 16)
    .lineTo(-40, y - 9).lineTo(-46, y - 21).lineTo(-18, y - 16).stroke({ color, width: 1.2 });
  for (let i = 0; i < 12; i++) g.rect(i % 4 * 4, y - 24 + Math.floor(i / 4) * 4, 3, 3).fill(color);
  g.moveTo(29, y).lineTo(29, y - 32).lineTo(54, y - 32).lineTo(54, y).stroke({ color, width: 3 });
  for (let i = 0; i < 6; i++) g.rect(76 + i * 0.7, y - (i + 1) * 7, 26 - i * 1.4, 6.5).fill(color);
  g.moveTo(-287, groundY).quadraticCurveTo(-260, y + 38, -218, y + 9)
    .lineTo(-191, y - 1).lineTo(-77, y + 1).lineTo(4, y - 1).lineTo(101, y - 1)
    .quadraticCurveTo(135, y + 9, 163, y + 35).lineTo(232, groundY).closePath().fill(color);
  echo.x = localBase;
  echo.alpha = 0.19;
  echo.addChild(g);
  container.addChild(echo);
}

export function createParallaxEnvironment(): ParallaxEnvironment {
  const back = new Container();
  const foreground = new Container();

  const distantContainer = new Container();
  const farContainer = new Container();
  const midContainer = new Container();
  const groundContainer = new Container();

  back.addChild(distantContainer, farContainer, midContainer, groundContainer);

  return {
    back,
    foreground,
    distantAtmosphere: { container: distantContainer, factor: 0.055 },
    farSilhouettes: { container: farContainer, factor: 0.13 },
    midground: { container: midContainer, factor: 0.28 },
    ground: { container: groundContainer, factor: GROUND_SCALE },
    foregroundLayer: { container: foreground, factor: GROUND_SCALE * 1.06 },
    groundY: 0,
    anchorX: 0,
    height: 0,
    computationCells: [],
  };
}

/** Builds the entire journey's geometry once (init + on resize) — never per frame. */
export function resizeParallaxEnvironment(env: ParallaxEnvironment, width: number, height: number, anchorX: number) {
  env.anchorX = anchorX;
  env.height = height;
  env.groundY = height * 0.82;
  // The set pieces extend below even the lowest point on the path.
  const groundY = height * 0.9;

  for (const layer of [env.distantAtmosphere, env.farSilhouettes, env.midground, env.ground, env.foregroundLayer]) {
    for (const child of layer.container.removeChildren()) child.destroy({ children: true });
  }

  const sky = env.distantAtmosphere;
  buildOverlookEcho(env.distantAtmosphere.container, LANDMARKS.overlookEcho * GLOBAL_WORLD_DISTANCE - width * 0.08 / sky.factor, env.distantAtmosphere.factor, groundY, height);

  // L2 — far silhouettes: the forest->architecture ambient drift.
  buildAmbientLayer(env.farSilhouettes.container, 23, 600, env.farSilhouettes.factor, FAR_NATURAL, FAR_STRUCTURED, [height * 0.09, height * 0.23], [43, 105], groundY, width);

  // L3 — midground: closer ambient drift, plus the bespoke landmarks.
  buildAmbientLayer(env.midground.container, 47, 830, env.midground.factor, MID_NATURAL, MID_STRUCTURED, [height * 0.12, height * 0.30], [64, 158], groundY, width);
  buildCitySkyline(env.midground.container, LANDMARKS.cityServers * GLOBAL_WORLD_DISTANCE, env.midground.factor, groundY, height);
  buildDepartureCanopy(env.midground.container, 18350 * env.midground.factor, groundY, height);
  buildMunichBridge(env.midground.container, LANDMARKS.munichBridge * GLOBAL_WORLD_DISTANCE, env.midground.factor, groundY, height);
  buildVectorGraph(env.midground.container, LANDMARKS.vectorGraph * GLOBAL_WORLD_DISTANCE, env.midground.factor, groundY, height);
  env.computationCells = buildComputationMatrix(env.midground.container, LANDMARKS.computationMatrix * GLOBAL_WORLD_DISTANCE, env.midground.factor, groundY, height);
  env.gateway = buildSecurityGateway(env.midground.container, LANDMARKS.securityGateway * GLOBAL_WORLD_DISTANCE, env.midground.factor, groundY, height);
  env.monument = buildEnterpriseMonument(width * 0.32, groundY, height);
  env.midground.container.addChild(env.monument.container);

  // L4 — the walking surface extends beyond both ends of the scroll range.
  buildGroundStrip(env.ground.container, height, width);

  // L5 — low silhouettes pass in front of the walking surface.
  buildWaysideGrasses(env.foregroundLayer, height, width);
}

/** Cheap per-frame repositioning + the few landmark details that animate — no geometry rebuilding here. */
export function updateParallaxEnvironment(env: ParallaxEnvironment, worldX: number, time: number) {
  for (const layer of [env.distantAtmosphere, env.farSilhouettes, env.midground, env.ground]) {
    layer.container.x = env.anchorX - worldX * layer.factor;
  }
  env.foreground.x = env.anchorX - worldX * env.foregroundLayer.factor;

  for (const cell of env.computationCells) {
    const flicker = 0.16 + 0.48 * (0.5 + 0.5 * Math.sin(time * 1.8 + cell.seed * 1.7));
    cell.g.alpha = flicker;
  }

  if (env.gateway) {
    env.gateway.glow.alpha = clamp(1 - Math.abs(worldX - env.gateway.worldX) / 260, 0, 1);
  }
  if (env.monument) {
    const { container, label } = env.monument;
    // This distant tower stays in view throughout the three migration stages.
    const distance = LANDMARKS.enterpriseMonument * GLOBAL_WORLD_DISTANCE - worldX;
    container.x = worldX * env.midground.factor + distance * 0.105;
    container.alpha = clamp(1 + Math.min(worldX - ENTERPRISE.startWorld, ENTERPRISE.endWorld - worldX) / 1100, 0, 1);
    const t = (worldX - ENTERPRISE.startWorld) / (ENTERPRISE.endWorld - ENTERPRISE.startWorld);
    const version = t < 1 / 3 ? "Odoo 17" : t < 2 / 3 ? "Odoo 18" : "Odoo 19";
    if (label.text !== version) label.text = version;
  }
}
