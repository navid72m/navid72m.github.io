"use client";

import { useRef, useSyncExternalStore } from "react";
import { SideScrollingWorld } from "./SideScrollingWorld";
import { ChapterOverlay } from "./ChapterOverlay";
import { FinalLinksPanel } from "./FinalLinksPanel";
import { ReducedMotionTimeline } from "./ReducedMotionTimeline";
import styles from "./journey.module.css";

/** Height of the native scroll spacer across all eight chapters. */
const SCROLL_LENGTH_VH = 800;

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

const getReducedMotionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Server has no media query; assume motion is fine and let the client correct it right after hydration. */
const getReducedMotionServerSnapshot = () => false;

export function JourneyExperience() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);

  if (reducedMotion) return <ReducedMotionTimeline />;

  return (
    <div className={styles.stageWrapper}>
      <div className={styles.stage}>
        <SideScrollingWorld overlayRef={overlayRef} linksRef={linksRef} />
        <ChapterOverlay ref={overlayRef} />
        <FinalLinksPanel ref={linksRef} />
        <div className={styles.grain} aria-hidden="true" />
      </div>
      <div className={styles.spacer} style={{ height: `${SCROLL_LENGTH_VH}vh` }} />
    </div>
  );
}
