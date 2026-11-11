import assert from "node:assert/strict";
import { test } from "node:test";
import { isEditPlan, validateEditPlan, type EditPlan } from "./edit-plan.js";

const sample: EditPlan = {
  schema_version: "1.0",
  project_id: "proj_demo",
  sequence_id: "seq_main",
  expected_revision: 43,
  mode: "preview_then_apply",
  intent: "Replace the chorus shot with Take 4 close-up and soften blue grade",
  constraints: { preserve_master_audio: true, no_synthetic_content: true },
  operations: [
    {
      type: "replace_clip_range",
      target_clip_id: "clip_48",
      range: { start_frame: 2016, end_frame: 2112 },
      source_asset_id: "asset_take4_close",
      source_in_frame: 876,
    },
    {
      type: "adjust_grade",
      scope: "scene_chorus_2",
      parameters: { blue_saturation_delta: -0.08 },
    },
  ],
  require_confirmation: false,
};

test("isEditPlan accepts PRD sample", () => {
  assert.equal(isEditPlan(sample), true);
});

test("validateEditPlan passes sample", () => {
  assert.deepEqual(validateEditPlan(sample), []);
});

test("validateEditPlan rejects inverted range", () => {
  const bad: EditPlan = {
    ...sample,
    operations: [
      {
        type: "replace_clip_range",
        target_clip_id: "c1",
        range: { start_frame: 10, end_frame: 5 },
        source_asset_id: "a1",
        source_in_frame: 0,
      },
    ],
  };
  assert.ok(validateEditPlan(bad).some((e) => e.includes("end before start")));
});
