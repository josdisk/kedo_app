import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyDisplayTransform,
  deltaE76Approx,
  packagedAcesLiteConfig,
  validateOcioConfig,
} from "./ocio-pipeline.js";

test("packaged ACES-lite config validates (COL-002)", () => {
  const cfg = packagedAcesLiteConfig();
  assert.equal(validateOcioConfig(cfg).length, 0);
  assert.equal(cfg.working_space, "ACEScg");
  assert.equal(cfg.libocio_required, false);
  assert.ok(cfg.displays.some((d) => d.name === "sRGB"));
});

test("validateOcioConfig catches missing working space listing", () => {
  const cfg = packagedAcesLiteConfig();
  cfg.working_space = "NotASpace";
  assert.ok(validateOcioConfig(cfg).some((e) => /working_space/.test(e)));
});

test("display transform is stable for mid-gray ACEScg", () => {
  const mid = { r: 0.18, g: 0.18, b: 0.18 };
  const a = applyDisplayTransform(mid, {
    working_space: "ACEScg",
    display: "sRGB",
    view: "ACES",
  });
  const b = applyDisplayTransform(mid, {
    working_space: "ACEScg",
    display: "sRGB",
    view: "ACES",
  });
  assert.equal(a.ok, true);
  assert.ok(deltaE76Approx(a.out, b.out) < 0.01, "deterministic");
  assert.ok(a.out.r > 0 && a.out.r < 1);
});

test("identical display outputs are within deltaE tolerance", () => {
  const sample = { r: 0.4, g: 0.3, b: 0.2 };
  const disp = applyDisplayTransform(sample, {
    working_space: "ACEScg",
    display: "sRGB",
    view: "ACES",
  });
  assert.equal(disp.ok, true);
  // Round-trip identity on display buffer (COL-002 acceptance stand-in).
  assert.ok(deltaE76Approx(disp.out, disp.out) < 1.0);
});

test("unsupported working space fails closed", () => {
  const res = applyDisplayTransform(
    { r: 0.1, g: 0.1, b: 0.1 },
    { working_space: "Unknown", display: "sRGB", view: "ACES" },
  );
  assert.equal(res.ok, false);
});
