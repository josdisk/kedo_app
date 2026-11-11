import assert from "node:assert/strict";
import { test } from "node:test";
import { groupTakesFromClips } from "./sync-session.js";

test("concurrent cameras share a take; later performance is separate", () => {
  const { takes, angles } = groupTakesFromClips([
    { asset_id: "cam_a", camera_label: "A", recorded_at_ms: 1_000_000 },
    { asset_id: "cam_b", camera_label: "B", recorded_at_ms: 1_002_000 },
    { asset_id: "cam_c", camera_label: "A", recorded_at_ms: 3_600_000 },
  ]);
  assert.equal(takes.length, 2);
  assert.equal(angles.length, 3);
  const takeA = angles.find((a) => a.asset_id === "cam_a")!.take_id;
  const takeB = angles.find((a) => a.asset_id === "cam_b")!.take_id;
  const takeC = angles.find((a) => a.asset_id === "cam_c")!.take_id;
  assert.equal(takeA, takeB);
  assert.notEqual(takeA, takeC);
});

test("explicit take id is preserved", () => {
  const { angles } = groupTakesFromClips([
    { asset_id: "x", recorded_at_ms: 0, explicit_take_id: "take_chorus_2" },
  ]);
  assert.equal(angles[0].take_id, "take_chorus_2");
});
