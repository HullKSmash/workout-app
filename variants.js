// Audience-specific configuration. Add a new entry to spin up a new variant,
// then point a domain at the same Vercel project (or pass ?variant=name locally).
export const VARIANTS = {
  default: {
    brandName: "SetGo",
    tagline: "Pick your program",
    audiences: null, // null = show variant links instead of workouts
    accent: "#E85D3A",
    accentLight: "#FFF0EC",
  },
  run: {
    brandName: "Runner Strength",
    tagline: "Strength work for faster miles",
    audiences: ["run"],
    accent: "#E85D3A",
    accentLight: "#FFF0EC",
  },
  paul: {
    brandName: "Paul Strength",
    tagline: "Pick it up, put it down",
    audiences: ["paul"],
    accent: "#2D6BD1",
    accentLight: "#EAF1FC",
  },
  equestrian: {
    brandName: "Equestrian Strength",
    tagline: "Strong riding starts on the ground",
    audiences: ["equestrian"],
    accent: "#355E3B",
    accentLight: "#EAF2EC",
  },
};

const HOSTNAME_PREFIXES = {
  "run.": "run",
  "paul.": "paul",
  "equestrian.": "equestrian",
};

export function resolveVariant() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("variant");
  if (fromQuery && VARIANTS[fromQuery]) return VARIANTS[fromQuery];

  const host = window.location.hostname;
  for (const [prefix, key] of Object.entries(HOSTNAME_PREFIXES)) {
    if (host.startsWith(prefix)) return VARIANTS[key];
  }
  return VARIANTS.default;
}
