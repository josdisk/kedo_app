import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAuthHeaders, resolveClientAuthMode } from "./auth-headers.js";

test("resolveClientAuthMode defaults to demo", () => {
  assert.equal(resolveClientAuthMode(undefined), "demo");
  assert.equal(resolveClientAuthMode("oidc"), "oidc");
});

test("demo headers include tenant keys", async () => {
  const h = await buildAuthHeaders({ userId: "u1", orgId: "o1" });
  assert.equal(h["x-kedov-user-id"], "u1");
  assert.equal(h["x-kedov-org-id"], "o1");
  assert.equal(h.Authorization, undefined);
});

test("oidc headers use Bearer token", async () => {
  const h = await buildAuthHeaders({
    mode: "oidc",
    getAccessToken: () => "tok_abc",
  });
  assert.equal(h.Authorization, "Bearer tok_abc");
});

test("oidc without token throws", async () => {
  await assert.rejects(
    () => buildAuthHeaders({ mode: "oidc", getAccessToken: () => null }),
    /unavailable/,
  );
});
