import assert from "node:assert/strict";
import { test } from "node:test";
import { identityFromOidcClaims } from "./oidc-auth.js";
import {
  extractOrgIdFromClaims,
  resolveJwksUrl,
  resolveOidcVerifierMode,
} from "./oidc-jwks.js";

test("resolveJwksUrl prefers explicit URL then issuer well-known", () => {
  assert.equal(
    resolveJwksUrl("https://issuer.example/", "https://keys.example/jwks.json"),
    "https://keys.example/jwks.json",
  );
  assert.equal(
    resolveJwksUrl("https://clerk.example"),
    "https://clerk.example/.well-known/jwks.json",
  );
  assert.equal(resolveJwksUrl(undefined, undefined), null);
});

test("extractOrgIdFromClaims supports Clerk o.id and preferred claim", () => {
  assert.equal(extractOrgIdFromClaims({ org_id: "org_a" }), "org_a");
  assert.equal(extractOrgIdFromClaims({ orgId: "org_b" }), "org_b");
  assert.equal(extractOrgIdFromClaims({ o: { id: "org_clerk" } }), "org_clerk");
  assert.equal(
    extractOrgIdFromClaims({ custom_org: "org_x", org_id: "org_a" }, "custom_org"),
    "org_x",
  );
});

test("identityFromOidcClaims accepts Clerk nested org", () => {
  const now = 1_700_000_000;
  const ok = identityFromOidcClaims(
    {
      sub: "user_1",
      o: { id: "org_clerk" },
      aud: "kedov-api",
      exp: now + 60,
    },
    { audience: "kedov-api", nowSec: now },
  );
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.identity.org_id, "org_clerk");
});

test("resolveOidcVerifierMode: explicit JWKS URL wins; HS256 wins over issuer-only", () => {
  assert.equal(
    resolveOidcVerifierMode({
      jwksUrl: "https://issuer.example/.well-known/jwks.json",
      hs256Secret: "secret",
    }),
    "jwks",
  );
  assert.equal(
    resolveOidcVerifierMode({
      issuer: "https://issuer.example",
      hs256Secret: "secret",
    }),
    "hs256",
  );
  assert.equal(resolveOidcVerifierMode({ issuer: "https://issuer.example" }), "jwks");
  assert.equal(resolveOidcVerifierMode({ hs256Secret: "secret" }), "hs256");
  assert.equal(resolveOidcVerifierMode({}), null);
});
