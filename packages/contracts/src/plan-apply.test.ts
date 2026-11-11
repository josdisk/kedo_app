import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEditPlan } from "./plan-apply.js";
import { planFirstCut } from "./first-cut.js";
import type { EditPlan } from "./edit-plan.js";

test("applyEditPlan rejects stale revision", () => {
  const plan: EditPlan = {
    schema_version: "1.0",
    project_id: "p",
    sequence_id: "s",
    expected_revision: 2,
    mode: "preview_then_apply",
    intent: "x",
    constraints: {},
    operations: [{ type: "slip_clip", clip_id: "c1", delta_frames: 1 }],
    require_confirmation: true,
  };
  const result = applyEditPlan(
    { sequence_id: "s", revision: 0, clips: [], grade_by_scope: {} },
    plan,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("revision conflict")));
});

test("first-cut plan applies grades and clip replacements", () => {
  const { plan } = planFirstCut({
    project_id: "p",
    sequence_id: "seq_main",
    expected_revision: 0,
    genre: "music_video",
    target_clip_id: "clip_main",
    candidates: [
      {
        asset_id: "asset_a",
        take_id: "take_1",
        sync_confidence: 0.9,
        start_frame: 0,
        end_frame: 72,
        source_in_frame: 0,
        tags: ["close_up"],
      },
    ],
  });
  const result = applyEditPlan(
    {
      sequence_id: "seq_main",
      revision: 0,
      clips: [
        {
          clip_id: "clip_main",
          asset_id: "old",
          track_id: "V1",
          start_frame: 0,
          end_frame: 10,
        },
      ],
      grade_by_scope: {},
    },
    plan,
  );
  assert.equal(result.ok, true);
  assert.equal(result.sequence.revision, 1);
  assert.ok(result.applied.length >= 1);
  assert.equal(result.sequence.clips[0].asset_id, "asset_a");
  assert.ok(Object.keys(result.sequence.grade_by_scope).length >= 1);
});

test("preserve_master_audio skips forbidden master replace", () => {
  const plan: EditPlan = {
    schema_version: "1.0",
    project_id: "p",
    sequence_id: "s",
    expected_revision: 0,
    mode: "preview_then_apply",
    intent: "x",
    constraints: { preserve_master_audio: true },
    operations: [
      {
        type: "replace_clip_range",
        target_clip_id: "clip_main",
        range: { start_frame: 0, end_frame: 10 },
        source_asset_id: "master_replace_bad",
        source_in_frame: 0,
      },
    ],
    require_confirmation: false,
  };
  const result = applyEditPlan(
    {
      sequence_id: "s",
      revision: 0,
      clips: [{ clip_id: "clip_main", asset_id: "a", track_id: "V1", start_frame: 0, end_frame: 10 }],
      grade_by_scope: {},
    },
    plan,
  );
  assert.equal(result.ok, true);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.sequence.clips[0].asset_id, "a");
});
