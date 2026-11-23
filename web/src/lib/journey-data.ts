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

/**
 * The mechanism/pattern/branch examination sequence is compressed into a
 * tiny slice of actual walking distance (PUZZLE_ZONE_SIM_SPAN) even though
 * it consumes a full PUZZLE_ZONE_RAW_SPAN worth of scroll — see
 * components/journey/PuzzleZoneGate.ts for how that mapping works. This is
 * what makes the character visibly stop at the puzzle instead of walking
 * through it.
 */
export const PUZZLE_ZONE_START = 1900;
export const PUZZLE_ZONE_RAW_SPAN = 3400;
export const PUZZLE_ZONE_SIM_SPAN = 339;

const PUZZLE_THIRD = PUZZLE_ZONE_SIM_SPAN / 3;
const MECHANISM_END = PUZZLE_ZONE_START + PUZZLE_THIRD;
const PATTERN_END = MECHANISM_END + PUZZLE_THIRD;
const BRANCHING_END = PATTERN_END + PUZZLE_THIRD;

export const CHAPTERS: Chapter[] = [
  {
    id: "childhood",
    title: "Childhood",
    startWorld: 0,
    endWorld: PUZZLE_ZONE_START,
    scene: { city: "tehran", description: "The Alborz rise above Tehran’s rooftops as a child sets out beneath the trees." },
    overlay: { eyebrow: "Childhood · Tehran", lines: ["Every journey begins with a question."] },
  },
  {
    id: "mechanism",
    title: "The Mechanism",
    startWorld: PUZZLE_ZONE_START,
    endWorld: MECHANISM_END,
    overlay: { lines: [] },
  },
  {
    id: "pattern",
    title: "Finding the Pattern",
    startWorld: MECHANISM_END,
    endWorld: PATTERN_END,
    overlay: { lines: ["I loved figuring things out."] },
  },
  {
    id: "branching",
    title: "Thinking Ahead",
    startWorld: PATTERN_END,
    endWorld: BRANCHING_END,
    overlay: { lines: [] },
  },
  {
    id: "curiosity",
    title: "Curiosity",
    startWorld: BRANCHING_END,
    endWorld: 8500,
    overlay: { lines: ["The puzzles grew bigger. So did my curiosity."] },
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
