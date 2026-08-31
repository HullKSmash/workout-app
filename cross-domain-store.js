// ─── Cross-subdomain persistence ─────────────────────────────────────────────
// A small key/value store that survives across the apex and every subdomain of
// the site (www., run., paul., equestrian.setgostrength.com, …). localStorage is
// partitioned per-origin, so on its own it re-prompts / re-gates a user on each
// subdomain. We persist to a cookie scoped to the registrable parent domain,
// which every subdomain can read, and keep localStorage as a same-origin fallback
// for hosts where such a cookie can't be set (localhost, *.vercel.app previews).
// Reads prefer the cookie, then fall back to localStorage.

const TWO_YEARS_SECONDS = 60 * 60 * 24 * 730;

// The `; Domain=...` attribute that scopes a cookie to the registrable parent
// domain so all subdomains share it. Returns "" (a host-only cookie) for hosts
// where a parent-domain cookie is inappropriate or impossible: localhost, bare
// IPs, and single-label hosts. Pure — safe to unit-test.
//
// Uses the last two labels, which is correct for a simple domain like
// setgostrength.com. Multi-part public suffixes (e.g. *.vercel.app) would yield a
// domain the browser rejects; the localStorage fallback covers those cases.
export function cookieDomainAttr(hostname) {
  if (!hostname) return "";
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return "";
  if (hostname.includes(":")) return ""; // IPv6 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return ""; // IPv4
  const labels = hostname.split(".");
  if (labels.length < 2) return ""; // single-label host
  const registrable = labels.slice(-2).join(".");
  return `; Domain=.${registrable}`;
}

// Extract a cookie value by name from a cookie string. Pure — safe to unit-test.
export function parseCookie(cookieString, name) {
  if (!cookieString) return null;
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

// Read a value: cookie first (shared across subdomains), then localStorage.
export function readValue(name) {
  try {
    const fromCookie = parseCookie(document.cookie, name);
    if (fromCookie !== null) return fromCookie;
  } catch {
    // document.cookie unavailable — fall through to localStorage.
  }
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

// Write a value to both the parent-domain cookie and localStorage.
export function writeValue(name, value) {
  const v = String(value);
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      `${name}=${encodeURIComponent(v)}; Path=/; Max-Age=${TWO_YEARS_SECONDS}` +
      `; SameSite=Lax${cookieDomainAttr(location.hostname)}${secure}`;
  } catch {
    // cookies unavailable — localStorage still records it same-origin.
  }
  try {
    localStorage.setItem(name, v);
  } catch {
    // localStorage unavailable (private mode/quota) — the cookie may still hold it.
  }
}

// Remove a value from both the cookie and localStorage.
export function removeValue(name) {
  try {
    document.cookie =
      `${name}=; Path=/; Max-Age=0; SameSite=Lax${cookieDomainAttr(
        location.hostname
      )}`;
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(name);
  } catch {
    // ignore
  }
}
