// One-time transform mapping a raw workout exercise name to its canonical
// core movement + side. Single source of truth shared by the catalog
// generator and the workout-file migrator so keys and names cannot drift.

const DELETE = new Set([
  "Jump squat stabilization",
  "Lateral Line Jumps",
  "Lying leg lift, left",
  "Lying leg lift, right",
]);

// exact raw name -> { core, side } ; side null means bilateral/unspecified
const REMAP = {
  "Adductor crosses": { core: "Lying Adductor Cross", side: null },
  "Dumbbell row": { core: "Row", side: null },
  "RDL": { core: "Romanian Dead Lift", side: null },
  "Deadlift": { core: "Romanian Dead Lift", side: null },
  "Plié squat": { core: "Sumo Squat", side: null },
  "Alternating row": { core: "Single Arm Row", side: "Alternating" },
  "Weighted bird dogs, L/R": { core: "Weighted Bird Dog", side: "Left" },
  "Weighted bird dogs, R/L": { core: "Weighted Bird Dog", side: "Right" },
  "Side lunge w/ balance press, L/R": { core: "Side Lunge w/ Balance Press", side: "Left" },
  "Side lunge w/ balance press, R/L": { core: "Side Lunge w/ Balance Press", side: "Right" },
  "Push up (Any kind)!": { core: "Push Up", side: null },
};

// core-level canonical merges that differ by more than casing.
// Exercise names are normalized to singular, so any lingering plural raw
// form collapses onto the canonical singular here.
const CANON = {
  "calf raise and curl": "Calf Raise & Curl",
  "row and kickback": "Row & Kickback",
  "mountain climbers": "Mountain Climber",
  "plank pikes": "Plank Pike",
  "runner hops": "Runner Hop",
  "to the chin lifts": "To-the-Chin Lift",
  "to-the-chin lift": "To-the-Chin Lift",
};

const MINOR = new Set(["and", "or", "the", "to", "of", "a", "an", "w/"]);

function titleCase(s) {
  const words = s.split(/\s+/);
  return words
    .map((tok, i) => {
      if (/^[A-Z]{2,}$/.test(tok)) return tok; // acronym e.g. RDL
      const lc = tok.toLowerCase();
      if (i > 0 && MINOR.has(lc)) return lc;
      return tok
        .split("/")
        .map((seg) => (seg ? seg[0].toUpperCase() + seg.slice(1).toLowerCase() : seg))
        .join("/");
    })
    .join(" ");
}

const SUFFIXES = [
  [/,\s*left arm\/right leg$/i, "Left"],
  [/,\s*right arm\/left leg$/i, "Right"],
  [/,\s*left side$/i, "Left"],
  [/,\s*right side$/i, "Right"],
  [/,\s*left$/i, "Left"],
  [/,\s*right$/i, "Right"],
  [/,\s*l$/i, "Left"],
  [/,\s*r$/i, "Right"],
];

// Returns { core, side } or null (movement deleted). Callers must skip "Rest".
export function deriveCore(name) {
  if (DELETE.has(name)) return null;
  if (REMAP[name]) {
    const r = REMAP[name];
    return { core: ampersandize(titleCase(r.core)), side: r.side };
  }
  let s = name;
  let side = null;
  for (const [re, val] of SUFFIXES) {
    if (re.test(s)) {
      side = val;
      s = s.replace(re, "");
      break;
    }
  }
  if (!side && /^alternating\s+/i.test(s)) {
    side = "Alternating";
    s = s.replace(/^alternating\s+/i, "");
  }
  let core = titleCase(s.trim());
  core = CANON[core.toLowerCase()] || core;
  return { core: ampersandize(core), side };
}

// Display convention: the standalone conjunction "and" renders as "&"
// (e.g. "Nordic and Curl" -> "Nordic & Curl"). Word-boundaried so it never
// touches substrings like "Standing" or "Banded".
function ampersandize(name) {
  return name.replace(/\band\b/gi, "&");
}
