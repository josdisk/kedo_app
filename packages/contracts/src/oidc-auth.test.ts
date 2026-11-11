import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeJwtPayloadUnsafe,
  identityFromDemoHeaders,
  identityFromOidcClaims,
  resolveAuthMode,
} from "./oidc-auth.js";
import { mintHs256Jwt, verifyHs256Jwt } from "./oidc-hs256.js";

test("resolveAuthMode defaults to demo", () => {
  assert.equal(resolveAuthMode(undefined), "demo");
  assert.equal(resolveAuthMode("OIDC"), "oidc");
});

test("demo headers work only in demo mode", () => {
  const ok = identityFromDemoHeaders("u1", "o1", "demo");
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.identity.mode, "demo");

  const blocked = identityFromDemoHeaders("u1", "o1", "oidc");
  assert.equal(blocked.ok, false);
});

test("OIDC claims require sub, org_id, and valid exp/aud", () => {
  const now = 1_700_000_000;
  const good = identityFromOidcClaims(
    {
      sub: "user_oidc",
      org_id: "org_oidc",
      iss: "https://issuer.example",
      aud: "kedov-api",
      exp: now + 60,
    },
    { issuer: "https://issuer.example", audience: "kedov-api", nowSec: now },
  );
  assert.equal(good.ok, true);

  const expired = identityFromOidcClaims(
    { sub: "u", org_id: "o", exp: now - 1 },
    { nowSec: now },
  );
  assert.equal(expired.ok, false);

  const badAud = identityFromOidcClaims(
    { sub: "u", org_id: "o", aud: "other", exp: now + 10 },
    { audience: "kedov-api", nowSec: now },
  );
  assert.equal(badAud.ok, false);
});

test("decodeJwtPayloadUnsafe reads middle segment", () => {
  const payload = Buffer.from(
    JSON.stringify({ sub: "u", org_id: "o", exp: 9999999999 }),
  ).toString("base64url");
  const token = `hdr.${payload}.sig`;
  const claims = decodeJwtPayloadUnsafe(token);
  assert.equal(claims?.sub, "u");
  assert.equal(claims?.org_id, "o");
});

test("mintHs256Jwt / verifyHs256Jwt round-trip", () => {
  const secret = "unit-test-secret";
  const token = mintHs256Jwt({ sub: "u1", org_id: "o1", exp: 9_999_999_999 }, secret);
  const claims = verifyHs256Jwt(token, secret);
  assert.equal(claims?.sub, "u1");
  assert.equal(verifyHs256Jwt(token, "other"), null);
});
