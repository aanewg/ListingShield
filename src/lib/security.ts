/**
 * Shared security utilities for all API routes.
 */

// ── SSRF allowlist ──────────────────────────────────────────────────────────

const ALLOWED_HOSTNAMES = new Set([
  "www.ebay.com",
  "ebay.com",
  "www.mercari.com",
  "mercari.com",
  "www.facebook.com",
  "facebook.com",
  "m.facebook.com",
  "www.poshmark.com",
  "poshmark.com",
  "www.depop.com",
  "depop.com",
]);

/**
 * Returns true only if the URL uses https:// and points to a known
 * marketplace hostname. Rejects file:, http:, internal IPs, cloud-metadata
 * endpoints, etc.
 */
export function isAllowedMarketplaceUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTNAMES.has(u.hostname);
  } catch {
    return false;
  }
}

// ── In-process rate limiter ─────────────────────────────────────────────────
// Resets on Vercel cold-start. Suitable for blocking casual abuse; for
// production at scale, swap for a Redis-backed solution (e.g. Upstash).

const _rl = new Map<string, { n: number; resetAt: number }>();

/**
 * Returns true if the caller is within quota; false → respond HTTP 429.
 *   key:        e.g. "analyze:1.2.3.4"
 *   limitPerMin: max requests allowed in a 60-second window
 */
export function checkRateLimit(key: string, limitPerMin: number): boolean {
  const now = Date.now();
  const entry = _rl.get(key);

  if (!entry || now > entry.resetAt) {
    _rl.set(key, { n: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.n >= limitPerMin) return false;
  entry.n++;
  return true;
}

// ── Client IP ───────────────────────────────────────────────────────────────

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

// ── Input sanitizers ────────────────────────────────────────────────────────

/** Coerces unknown → string, truncated to maxLen. Returns undefined if not a string. */
export function sanitizeStr(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, maxLen);
}

/**
 * Coerces unknown → number, validated in [min, max].
 * Returns undefined for null, undefined, non-finite, or out-of-range values.
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  if (!isFinite(n) || n < min || n > max) return undefined;
  return n;
}

// ── Allowed enum values ─────────────────────────────────────────────────────

export const VALID_PLATFORMS = new Set([
  "facebook",
  "ebay",
  "mercari",
  "poshmark",
  "depop",
  "other",
]);

export const VALID_REPORT_TYPES = new Set([
  "scam",
  "counterfeit",
  "fake_reviews",
  "bait_switch",
  "other",
]);
