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
    library: true, // self-directed workout library is the default screen
  },
  paul: {
    brandName: "Paul Strength",
    tagline: "Pick it up, put it down",
    audiences: ["paul"],
    accent: "#2D6BD1",
    accentLight: "#EAF1FC",
    library: true,
    unlisted: true, // hidden from the portal unless a matching code is used; still reachable via ?variant=paul / paul. subdomain
    unlockCodes: ["paul"], // access codes that reveal it in the portal (normalized, lowercase)
  },
  equestrian: {
    brandName: "Equestrian Strength",
    tagline: "Strong riding starts on the ground",
    audiences: ["equestrian"],
    accent: "#355E3B",
    accentLight: "#EAF2EC",
    library: true,
    schedule: true, // also offers the secondary 12-week program schedule
  },
};

const HOSTNAME_PREFIXES = {
  "run.": "run",
  "paul.": "paul",
  "equestrian.": "equestrian",
};

// Reverse of HOSTNAME_PREFIXES: variant key -> subdomain label (no trailing dot).
const VARIANT_SUBDOMAINS = Object.fromEntries(
  Object.entries(HOSTNAME_PREFIXES).map(([prefix, key]) => [
    key,
    prefix.replace(/\.$/, ""),
  ])
);

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

// Build the link a portal card should use to enter a variant. On the production
// site each variant lives on its own subdomain (run./equestrian./paul.), so we link to
// the absolute subdomain URL. On hosts without those subdomains — localhost, bare
// IPs, and Vercel preview builds (*.vercel.app) — we fall back to the ?variant=
// query string that resolveVariant() also understands.
export function variantHref(key) {
  const sub = VARIANT_SUBDOMAINS[key];
  const host = window.location.hostname;
  const canUseSubdomain =
    sub &&
    host !== "localhost" &&
    !host.endsWith(".localhost") &&
    !host.endsWith(".vercel.app") &&
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) &&
    host.split(".").length >= 2;
  if (!canUseSubdomain) return `?variant=${key}`;
  const parent = host.split(".").slice(-2).join(".");
  return `${window.location.protocol}//${sub}.${parent}/`;
}
