import { forwardRef } from "react";
import styles from "./journey.module.css";

const MAX_LINES = 4;

/**
 * Real, accessible HTML. JourneyEngine mutates this element's opacity and
 * its children's text content directly (not via React state) so a
 * scroll-driven fade never triggers a React re-render of the whole tree
 * every frame. Empty line slots collapse via CSS (:empty), so chapters with
 * fewer lines don't leave gaps.
 */
export const ChapterOverlay = forwardRef<HTMLDivElement>(function ChapterOverlay(_props, ref) {
  return (
    <div ref={ref} className={styles.chapterOverlay} aria-live="polite" style={{ opacity: 0 }}>
      <p className="chapterOverlayEyebrow" />
      {Array.from({ length: MAX_LINES }, (_, i) => (
        <p key={i} className="chapterOverlayLine" />
      ))}
      <span className="chapterScrollHint" hidden>↓ &nbsp; Scroll to walk</span>
    </div>
  );
});
