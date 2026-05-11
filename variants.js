// Audience-specific configuration. Add a new entry to spin up a new variant,
// then point a domain at the same Vercel project (or pass ?variant=name locally).
export const VARIANTS = {
  default: {
    brandName: "SetGo",
    tagline: "Choose a workout",
    audiences: null, // null = show all workouts
    accent: "#E85D3A",
    accentLight: "#FFF0EC",
  },
  run: {
    brandName: "Run Strong",
    tagline: "Strength work for faster miles",
    audiences: ["run"],
    accent: "#E85D3A",
    accentLight: "#FFF0EC",
  },
  lift: {
    brandName: "SetGo Lift",
    tagline: "Pick it up, put it down",
    audiences: ["lift"],
    accent: "#2D6BD1",
    accentLight: "#EAF1FC",
  },
};

const HOSTNAME_PREFIXES = {
  "run.": "run",
  "lift.": "lift",
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
