import { Application, Ticker } from "pixi.js";
import { JourneyController } from "./JourneyController";
import { trailY } from "./JourneyTerrain";
import { GROUND_SCALE, WorldCamera } from "./WorldCamera";
import { PuzzleZoneGate, simFromRaw } from "./PuzzleZoneGate";
import { CharacterGrowthController } from "./CharacterGrowthController";
import { CharacterAnimator } from "./CharacterAnimator";
import { createCharacterRig, updateCharacterRig, type CharacterRig } from "./CharacterRig2D";
import {
  createParallaxEnvironment,
  resizeParallaxEnvironment,
  updateParallaxEnvironment,
  type ParallaxEnvironment,
} from "./ParallaxEnvironment";
import { createAtmosphericEffects, resizeAtmosphericEffects, type AtmosphericEffects } from "./AtmosphericEffects";
import { clamp, smoothstep } from "./mathUtils";
import { CHAPTERS, GLOBAL_WORLD_DISTANCE, SCROLLABLE_WORLD_DISTANCE, type Chapter } from "@/lib/journey-data";

const CHARACTER_SCREEN_X_RATIO = 0.33;
const OVERLAY_FADE_MARGIN = 220;
/** Fraction of the final chapter's length at which the contact links start fading in / are fully shown. */
const LINKS_FADE_START_T = 0.45;
const LINKS_FADE_FULL_T = 0.75;

const FINAL_CHAPTER = CHAPTERS[CHAPTERS.length - 1];

export interface JourneyEngineOptions {
  mountEl: HTMLElement;
  overlayEl: HTMLElement;
  linksEl: HTMLElement;
}

export class JourneyEngine {
  private app: Application | null = null;
  private scrollCtl = new JourneyController();
  private camera = new WorldCamera();
  private puzzleGate = new PuzzleZoneGate();
  private growth = new CharacterGrowthController();
  private animator = new CharacterAnimator();
  private rig: CharacterRig | null = null;
  private env: ParallaxEnvironment | null = null;
  private atmo: AtmosphericEffects | null = null;
  private lastBackdropX = NaN;
  private baseAdultHeight = 160;
  private activeChapterId: string | null = null;
  private time = 0;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private options: JourneyEngineOptions) {}

  async init() {
    const app = new Application();
    await app.init({
      width: this.options.mountEl.clientWidth,
      height: this.options.mountEl.clientHeight,
      backgroundAlpha: 0,
      antialias: true,
      resolution: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      autoDensity: true,
    });

    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }

    this.app = app;
    this.options.mountEl.appendChild(app.canvas);

    this.env = createParallaxEnvironment();
    this.rig = createCharacterRig();
    this.atmo = createAtmosphericEffects();

    app.stage.addChild(this.env.back);
    app.stage.addChild(this.rig.root);
    app.stage.addChild(this.env.foreground);
    app.stage.addChild(this.atmo.container);

    this.handleResize();
    this.resizeObserver = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = this.options.mountEl;
      if (clientWidth > 0 && clientHeight > 0 && (app.screen.width !== clientWidth || app.screen.height !== clientHeight)) {
        app.renderer.resize(clientWidth, clientHeight);
        this.handleResize();
      }
    });
    this.resizeObserver.observe(this.options.mountEl);

    this.scrollCtl.start();
    this.camera.worldX = this.scrollCtl.scrollProgress * SCROLLABLE_WORLD_DISTANCE;
    app.ticker.add(this.tick);
  }

  private handleResize = () => {
    const app = this.app;
    const env = this.env;
    const rig = this.rig;
    const atmo = this.atmo;
    if (!app || !env || !rig || !atmo) return;

    const width = app.screen.width;
    const height = app.screen.height;
    if (width <= 0 || height <= 0) return;

    this.baseAdultHeight = clamp(height * 0.26, 90, 220);
    rig.root.position.x = width * CHARACTER_SCREEN_X_RATIO;

    resizeParallaxEnvironment(env, width, height, rig.root.position.x);
    resizeAtmosphericEffects(atmo, width, height);
  };

  private tick = (ticker: Ticker) => {
    if (!this.rig || !this.env) return;
    const dt = Math.min(ticker.elapsedMS, 100) / 1000;
    this.time += dt;

    const raw = this.scrollCtl.scrollProgress * SCROLLABLE_WORLD_DISTANCE;
    const zoneProgress = this.puzzleGate.update(raw, dt);
    const targetWorldX = simFromRaw(raw, zoneProgress);
    const { worldX, velocity } = this.camera.update(targetWorldX, dt);
    const journeyProgress = worldX / GLOBAL_WORLD_DISTANCE;

    const proportions = this.growth.getProportions(journeyProgress);
    const pose = this.animator.update(velocity, proportions, dt);

    const height = this.env.height;
    const groundY = trailY(worldX, height);
    const slope = (trailY(worldX + 40, height) - trailY(worldX - 40, height)) / (80 * GROUND_SCALE);
    const studyBag = smoothstep((worldX - 8500) / 1600) * (1 - smoothstep((worldX - 23500) / 1600));
    updateCharacterRig(this.rig, proportions, pose, groundY, this.baseAdultHeight, slope, studyBag);
    if (worldX !== this.lastBackdropX) {
      this.lastBackdropX = worldX;
      const sky = this.options.mountEl.style;
      sky.setProperty("--pan", `${5 - 10 * journeyProgress}%`);
      sky.setProperty("--munich", String(smoothstep((worldX - 17500) / 2700)));
      const rasht = smoothstep((worldX - FINAL_CHAPTER.startWorld + 550) / 1900);
      sky.setProperty("--rasht", String(rasht));
      // Let the technical landmarks take the foreground between the two cities.
      const work = smoothstep((worldX - 23600) / 2400) * (1 - rasht);
      sky.setProperty("--horizon-opacity", String(1 - 0.74 * work));
    }
    updateParallaxEnvironment(this.env, worldX, this.time);
    this.updateOverlay(worldX);
  };

  private updateOverlay(worldX: number) {
    const chapter: Chapter = CHAPTERS.find((c) => worldX >= c.startWorld && worldX <= c.endWorld) ?? FINAL_CHAPTER;
    const isFinal = chapter.id === FINAL_CHAPTER.id;

    if (chapter.id !== this.activeChapterId) {
      this.activeChapterId = chapter.id;
      const hint = this.options.overlayEl.querySelector<HTMLElement>(".chapterScrollHint");
      if (hint) hint.hidden = chapter !== CHAPTERS[0];
      const eyebrowEl = this.options.overlayEl.querySelector<HTMLElement>(".chapterOverlayEyebrow");
      if (eyebrowEl) eyebrowEl.textContent = chapter.overlay.eyebrow ?? chapter.title;
      const lineEls = this.options.overlayEl.querySelectorAll<HTMLElement>(".chapterOverlayLine");
      lineEls.forEach((el, i) => {
        el.textContent = chapter.overlay.lines[i] ?? "";
      });
    }

    const distIn = chapter === CHAPTERS[0] ? OVERLAY_FADE_MARGIN : worldX - chapter.startWorld;
    const distOut = chapter.endWorld - worldX;
    // The final chapter's text holds once reached, rather than fading out as the scroll bottoms out.
    const opacity = isFinal ? clamp(distIn / OVERLAY_FADE_MARGIN, 0, 1) : clamp(Math.min(distIn, distOut) / OVERLAY_FADE_MARGIN, 0, 1);
    this.options.overlayEl.style.opacity = String(opacity);

    if (chapter.links) {
      const length = chapter.endWorld - chapter.startWorld;
      const startT = chapter.startWorld + length * LINKS_FADE_START_T;
      const fullT = chapter.startWorld + length * LINKS_FADE_FULL_T;
      const linksOpacity = clamp((worldX - startT) / (fullT - startT), 0, 1);
      this.options.linksEl.style.opacity = String(linksOpacity);
      this.options.linksEl.inert = linksOpacity < 0.35;
    } else {
      this.options.linksEl.style.opacity = "0";
      this.options.linksEl.inert = true;
    }
  }

  destroy() {
    this.destroyed = true;
    this.scrollCtl.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.app) {
      this.app.ticker.remove(this.tick);
      this.atmo?.container.texture.destroy(true);
      this.app.destroy(true, { children: true });
      this.app = null;
    }
  }
}
