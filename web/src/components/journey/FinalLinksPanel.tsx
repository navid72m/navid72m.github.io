import { forwardRef } from "react";
import { CHAPTERS } from "@/lib/journey-data";
import styles from "./journey.module.css";

const links = CHAPTERS[CHAPTERS.length - 1].links ?? [];

export function ContactLinks() {
  return links.map((link) => {
    const external = link.href.startsWith("https://");
    return (
      <a key={link.href} href={link.href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {link.label}
      </a>
    );
  });
}

export const FinalLinksPanel = forwardRef<HTMLDivElement>(function FinalLinksPanel(_props, ref) {
  return (
    <div ref={ref} className={styles.finalLinks} style={{ opacity: 0 }} inert>
      <ContactLinks />
    </div>
  );
});
