import { clamp } from "./mathUtils";

/**
 * Captures raw page scroll and normalizes it to 0..1. This is the ONLY place
 * that reads scroll — nothing downstream ever sees wheel delta or velocity,
 * which is what keeps fast scrolling from turning into fast running.
 */
export class JourneyController {
  scrollProgress = 0;

  private handleScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    this.scrollProgress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  };

  start() {
    this.handleScroll();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleScroll);
  }

  stop() {
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleScroll);
  }
}
