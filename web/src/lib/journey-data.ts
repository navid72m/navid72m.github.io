export interface ChapterOverlayContent {
  eyebrow?: string;
  lines: string[];
}

export interface ChapterLink {
  label: string;
  href: string;
}

export interface Chapter {
  id: string;
  title: string;
  /** World-space distance (px) where this chapter's stretch of the walk begins/ends. */
  startWorld: number;
  endWorld: number;
  overlay: ChapterOverlayContent;
  scene?: { city: "tehran" | "munich" | "rasht"; description: string };
  /** Only the final chapter carries the contact links panel. */
  links?: ChapterLink[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: "childhood",
    title: "Childhood",
    startWorld: 0,
    endWorld: 4000,
    scene: { city: "tehran", description: "The Alborz rise above Tehran’s rooftops as a child sets out beneath the trees." },
    overlay: { eyebrow: "Childhood · Tehran", lines: ["Every journey begins somewhere."] },
  },
  {
    id: "curiosity",
    title: "Curiosity",
    startWorld: 4000,
    endWorld: 8500,
    overlay: { lines: ["Some questions change the direction of a life."] },
  },
  {
    id: "learning",
    title: "Education",
    startWorld: 8500,
    endWorld: 14000,
    overlay: {
      eyebrow: "Education · Tehran",
      lines: [
        "Computer Engineering — Amirkabir University of Technology",
        "Graduate studies — Technical University of Munich",
      ],
    },
  },
  {
    id: "first-engineering",
    title: "First engineering role",
    startWorld: 14000,
    endWorld: 18500,
    overlay: {
      eyebrow: "2016 — Quiz of Kings",
      lines: ["Go backends serving 1M+ monthly users.", "40% lower database latency."],
    },
  },
  {
    id: "munich",
    title: "Munich",
    startWorld: 18500,
    endWorld: 24000,
    scene: { city: "munich", description: "The path dips beneath a departure sign and climbs again. Beyond the bridge, Munich’s twin domes come into view." },
    overlay: {
      eyebrow: "Munich · 2018",
      lines: ["I moved from Tehran to pursue my graduate degree.", "2022 — MDOP", "2023 — Node-h"],
    },
  },
  {
    id: "systems",
    title: "Independent systems",
    startWorld: 24000,
    endWorld: 29500,
    overlay: {
      eyebrow: "mcp-behave",
      lines: ["Runtime security auditing for MCP servers.", "14k+ PyPI downloads."],
    },
  },
  {
    id: "enterprise",
    title: "Enterprise migration",
    startWorld: 29500,
    endWorld: 33500,
    overlay: {
      eyebrow: "2026 — Vandaw",
      lines: ["1,400+ table ERP migration.", "Completed independently in under one month."],
    },
  },
  {
    id: "present",
    title: "Present day",
    startWorld: 33500,
    endWorld: 37000,
    scene: { city: "rasht", description: "In Rasht, the path levels out beside the rain-washed square and its clock tower." },
    overlay: {
      eyebrow: "Present day · Rasht",
      lines: ["Navid Mirnouri", "AI & Software Engineer", "The journey is still being written."],
    },
    links: [
      { label: "GitHub", href: "https://github.com/navid72m" },
      { label: "LinkedIn", href: "https://linkedin.com/in/navid-mirnouri" },
      { label: "Email", href: "mailto:navid72m@gmail.com" },
      { label: "CV", href: "/Navid_Mirnouri.pdf" },
    ],
  },
];

export const GLOBAL_WORLD_DISTANCE = CHAPTERS[CHAPTERS.length - 1].endWorld;
export const SCROLLABLE_WORLD_DISTANCE = GLOBAL_WORLD_DISTANCE;

/**
 * World positions (as a fraction 0..1 of the full journey) of the specific
 * named landmarks called out in the brief. ParallaxEnvironment places its
 * bespoke set-pieces at these points; the ambient tree/column/server motif
 * blends continuously underneath them.
 */
export const LANDMARKS = {
  guidingLight: 0.055,
  cityServers: 0.44,
  munichBridge: 0.56,
  vectorGraph: 0.68,
  computationMatrix: 0.73,
  securityGateway: 0.78,
  enterpriseMonument: 0.86,
  overlookEcho: 0.97,
};
