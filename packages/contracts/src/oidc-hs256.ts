/** Node-only HS256 JWT helpers. Do not import from browser bundles. */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { OidcClaims } from "./oidc-auth.js";

/** Local/dev HS256 JWT verify. Production uses issuer JWKS (RS256). */
export function verifyHs256Jwt(
  token: string,
  secret: string,
): OidcClaims | null {
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sigB64!, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payloadB64!, "base64url").toString("utf8")) as OidcClaims;
  } catch {
    return null;
  }
}

/** Mint HS256 JWT for local tests (not for production IdP). */
export function mintHs256Jwt(claims: OidcClaims, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}
