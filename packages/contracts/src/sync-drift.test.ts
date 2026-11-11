import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPiecewiseMap,
  constantOffsetMap,
  mapSourceToMaster,
  reduceSlope,
} from "./sync-drift.js";

test("reduceSlope reduces and normalizes sign", () => {
  assert.deepEqual(reduceSlope(4, 2), { num: 2, den: 1 });
  assert.deepEqual(reduceSlope(-6, -3), { num: 2, den: 1 });
  assert.deepEqual(reduceSlope(6, -3), { num: -2, den: 1 });
});

test("constant offset map has unity slope and exact mapping", () => {
  const map = constantOffsetMap(4800, 48000);
  assert.equal(map.has_drift, false);
  assert.equal(map.segments[0]?.slope_num, 1);
  assert.equal(map.segments[0]?.slope_den, 1);
  assert.equal(mapSourceToMaster(map, 0), 4800);
  assert.equal(mapSourceToMaster(map, 24000), 28800);
});

test("piecewise affine detects clock drift (SYN-005)", () => {
  // Source clock runs slow: after 48000 source samples, master advanced 48100.
  const map = buildPiecewiseMap([
    { source_sample: 0, master_sample: 100, confidence: 0.95 },
    { source_sample: 48000, master_sample: 48200, confidence: 0.93 },
  ]);
  assert.equal(map.has_drift, true);
  assert.equal(map.segments.length, 1);
  // (48200-100)/(48000-0) = 48100/48000 → 481/480
  assert.equal(map.segments[0]?.slope_num, 481);
  assert.equal(map.segments[0]?.slope_den, 480);
  assert.equal(mapSourceToMaster(map, 0), 100);
  assert.equal(mapSourceToMaster(map, 48000), 48200);
  assert.ok(map.mean_abs_residual < 1);
});

test("multi-segment piecewise map preserves local slopes", () => {
  const map = buildPiecewiseMap([
    { source_sample: 0, master_sample: 0, confidence: 0.9 },
    { source_sample: 1000, master_sample: 1000, confidence: 0.9 },
    { source_sample: 2000, master_sample: 2010, confidence: 0.85 },
  ]);
  assert.equal(map.segments.length, 2);
  assert.equal(map.segments[0]?.slope_num, 1);
  assert.equal(map.segments[0]?.slope_den, 1);
  assert.equal(map.has_drift, true);
  assert.equal(mapSourceToMaster(map, 500), 500);
  assert.equal(mapSourceToMaster(map, 2000), 2010);
});
