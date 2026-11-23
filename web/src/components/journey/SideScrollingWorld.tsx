"use client";

import { useEffect, useRef } from "react";
import { JourneyEngine } from "./JourneyEngine";

import styles from "./journey.module.css";

interface SideScrollingWorldProps {
  overlayRef: React.RefObject<HTMLDivElement | null>;
  linksRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Owns the single PixiJS canvas + animation loop. Mounted once; nothing in
 * here causes React to re-render per frame — all motion lives inside
 * JourneyEngine's own ticker.
 */
export function SideScrollingWorld({ overlayRef, linksRef }: SideScrollingWorldProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountEl = mountRef.current;
    const overlayEl = overlayRef.current;
    const linksEl = linksRef.current;
    if (!mountEl || !overlayEl || !linksEl) return;

    const engine = new JourneyEngine({ mountEl, overlayEl, linksEl });
    let cancelled = false;

    engine.init().then(() => {
      if (cancelled) engine.destroy();
    });

    return () => {
      cancelled = true;
      engine.destroy();
    };
  }, [overlayRef, linksRef]);

  return (
    <div ref={mountRef} className={styles.world} aria-hidden="true">
      <div className={styles.panorama}>
        <div className={styles.tehran} />
        <div className={styles.munich} />
        <div className={styles.rasht} />
      </div>
    </div>
  );
}
