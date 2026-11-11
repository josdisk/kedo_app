/** OIDC / demo auth mode contract (SVC). Never trust LLM-supplied identity. */

import { extractOrgIdFromClaims } from "./oidc-jwks.js";

export type AuthMode = "demo" | "oidc";

export interface OidcClaims {
  sub: string;
  org_id?: string;
  orgId?: string;
  /** Clerk-style organization object: `{ id: "org_..." }`. */
  o?: { id?: string };
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface AuthIdentity {
  user_id: string;
  org_id: string;
  mode: AuthMode;
  claims?: OidcClaims;
}

export function resolveAuthMode(envMode?: string): AuthMode {
  return envMode?.trim().toLowerCase() === "oidc" ? "oidc" : "demo";
}

export function audienceMatches(
  claimAud: string | string[] | undefined,
  expected: string,
): boolean {
  if (!expected) return false;
  if (typeof claimAud === "string") return claimAud === expected;
  if (Array.isArray(claimAud)) return claimAud.includes(expected);
  return false;
}

/**
 * Validate decoded OIDC claims for API tenancy.
 * Signature verification is done by the verifier; this checks tenant fields only.
 */
export function identityFromOidcClaims(
  claims: OidcClaims,
  opts: {
    issuer?: string;
    audience?: string;
    nowSec?: number;
    orgClaim?: string;
  },
): { ok: true; identity: AuthIdentity } | { ok: false; reason: string } {
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (!claims.sub?.trim()) return { ok: false, reason: "missing sub" };
  const orgId = extractOrgIdFromClaims(
    claims as Record<string, unknown>,
    opts.orgClaim,
  );
  if (!orgId) return { ok: false, reason: "missing org_id claim" };
  if (claims.exp != null && claims.exp < now) return { ok: false, reason: "token expired" };
  if (opts.issuer && claims.iss && claims.iss !== opts.issuer) {
    return { ok: false, reason: "issuer mismatch" };
  }
  if (opts.audience && !audienceMatches(claims.aud, opts.audience)) {
    return { ok: false, reason: "audience mismatch" };
  }
  return {
    ok: true,
    identity: {
      user_id: claims.sub.trim(),
      org_id: orgId,
      mode: "oidc",
      claims: { ...claims, org_id: orgId },
    },
  };
}

/** Demo header auth — local only; forbidden when AUTH_MODE=oidc. */
export function identityFromDemoHeaders(
  userId: string | undefined,
  orgId: string | undefined,
  mode: AuthMode,
): { ok: true; identity: AuthIdentity } | { ok: false; reason: string } {
  if (mode === "oidc") {
    return { ok: false, reason: "demo headers disabled when AUTH_MODE=oidc" };
  }
  const user_id = (userId ?? "").trim();
  const org_id = (orgId ?? "").trim();
  if (!user_id) return { ok: false, reason: "missing x-kedov-user-id" };
  if (!org_id) return { ok: false, reason: "missing x-kedov-org-id" };
  return { ok: true, identity: { user_id, org_id, mode: "demo" } };
}

function b64urlToUtf8(segment: string): string {
  const pad = "=".repeat((4 - (segment.length % 4)) % 4);
  const b64 = (segment + pad).replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob === "function") {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Node fallback without importing node:buffer in the browser graph.
  // eslint-disable-next-line no-undef
  return Buffer.from(segment, "base64url").toString("utf8");
}

/** Parse compact JWT payload (middle segment) without verifying signature — tests/helpers only. */
export function decodeJwtPayloadUnsafe(token: string): OidcClaims | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    return JSON.parse(b64urlToUtf8(parts[1]!)) as OidcClaims;
  } catch {
    return null;
  }
}

export function bearerTokenFromAuthorization(header: string | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)/i.exec(header.trim());
  return m?.[1] ?? null;
}
