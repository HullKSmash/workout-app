// Shared Upstash Redis client for the API functions. The Vercel Upstash
// integration injects HTTP-REST credentials as KV_REST_API_URL /
// KV_REST_API_TOKEN; we read those directly (with UPSTASH_* as a fallback in
// case a future re-provision uses that naming). `Redis.fromEnv()` is NOT used
// because it only looks for the UPSTASH_* names.
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const ALLOWLIST_KEY = "allowlist";
export const EVENTS_KEY = "events";
export const countKey = (code) => `count:${code}`;
