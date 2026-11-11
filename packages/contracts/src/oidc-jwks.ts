/** OIDC JWKS resolution helpers (SVC). Network fetch lives in the API verifier. */

/** Derive standard JWKS URL from issuer when OIDC_JWKS_URL is unset. */
export function resolveJwksUrl(
  issuer?: string,
  explicitJwksUrl?: string,
): string | null {
  const explicit = explicitJwksUrl?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const iss = issuer?.trim().replace(/\/$/, "");
  if (!iss) return null;
  return `${iss}/.well-known/jwks.json`;
}

/**
 * Normalize tenant org id from common IdP claim shapes (Clerk `o.id`, `org_id`, `orgId`).
 * Prefer OIDC_ORG_CLAIM when set to a top-level claim name.
 */
export function extractOrgIdFromClaims(
  claims: Record<string, unknown>,
  preferredClaim?: string,
): string | undefined {
  if (preferredClaim?.trim()) {
    const direct = claims[preferredClaim.trim()];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }
  if (typeof claims.org_id === "string" && claims.org_id.trim()) {
    return claims.org_id.trim();
  }
  if (typeof claims.orgId === "string" && claims.orgId.trim()) {
    return claims.orgId.trim();
  }
  const nested = claims.o;
  if (nested && typeof nested === "object") {
    const id = (nested as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return undefined;
}

export type OidcVerifierMode = "hs256" | "jwks";

/**
 * Choose verifier:
 * - explicit OIDC_JWKS_URL → JWKS
 * - API_OIDC_HS256_SECRET → local HS256 (even if issuer set for claim checks)
 * - issuer only → JWKS via well-known
 */
export function resolveOidcVerifierMode(env: {
  jwksUrl?: string;
  issuer?: string;
  hs256Secret?: string;
}): OidcVerifierMode | null {
  if (env.jwksUrl?.trim()) return "jwks";
  if (env.hs256Secret?.trim()) return "hs256";
  if (env.issuer?.trim()) return "jwks";
  return null;
}
