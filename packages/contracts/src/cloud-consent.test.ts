import assert from "node:assert/strict";
import { test } from "node:test";
import { assertCloudConsent } from "./cloud-consent.js";

test("mock provider needs no consent", () => {
  assert.equal(assertCloudConsent({ provider: "mock" }).ok, true);
});

test("cloud provider requires consent and non-local privacy", () => {
  assert.equal(
    assertCloudConsent({ provider: "openai", cloud_consent: false }).ok,
    false,
  );
  assert.equal(
    assertCloudConsent({
      provider: "openai",
      cloud_consent: true,
      privacy_mode: "local_first",
    }).ok,
    false,
  );
  assert.equal(
    assertCloudConsent({
      provider: "openai",
      cloud_consent: true,
      privacy_mode: "cloud_allowed",
    }).ok,
    true,
  );
});
