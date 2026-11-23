import Image from "next/image";
import { CHAPTERS } from "@/lib/journey-data";
import { ContactLinks } from "./FinalLinksPanel";
import styles from "./journey.module.css";

export function ReducedMotionTimeline() {
  return (
    <main className={styles.reducedMain}>
      <h1>Navid Mirnouri</h1>
      {CHAPTERS.map((chapter) => (
        <section className={styles.reducedChapter} key={chapter.id}>
          <h2>{chapter.title}</h2>
          {chapter.scene && (
            <figure className={styles.cityStill}>
              <Image src={`/journey/${chapter.scene.city}.webp`} width={1280} height={720} unoptimized alt="" />
              <figcaption>{chapter.scene.description}</figcaption>
            </figure>
          )}
          {chapter.overlay.eyebrow && chapter.overlay.eyebrow !== chapter.title && <p>{chapter.overlay.eyebrow}</p>}
          {chapter.overlay.lines.map((line) => <p key={line}>{line}</p>)}
          {chapter.links && <nav aria-label="Contact"><ContactLinks /></nav>}
        </section>
      ))}
    </main>
  );
}
