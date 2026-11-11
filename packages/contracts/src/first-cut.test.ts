import assert from "node:assert/strict";
import { test } from "node:test";
import { planFirstCut, GENRE_POLICIES } from "./first-cut.js";
import { validateEditPlan } from "./edit-plan.js";

const baseCandidates = [
  {
    asset_id: "asset_take1_wide",
    take_id: "take_1",
    sync_confidence: 0.95,
    start_frame: 0,
    end_frame: 96,
    source_in_frame: 0,
    tags: ["wide"],
  },
  {
    asset_id: "asset_take4_close",
    take_id: "take_4",
    sync_confidence: 0.91,
    start_frame: 96,
    end_frame: 192,
    source_in_frame: 10,
    tags: ["close_up"],
  },
  {
    asset_id: "asset_bad_sync",
    take_id: "take_9",
    sync_confidence: 0.1,
    start_frame: 192,
    end_frame: 280,
    source_in_frame: 0,
  },
  {
    asset_id: "asset_too_short",
    take_id: "take_2",
    sync_confidence: 0.99,
    start_frame: 280,
    end_frame: 290,
    source_in_frame: 0,
  },
];

test("music_video first cut prefers sync and preserves master audio", () => {
  const result = planFirstCut({
    project_id: "proj_demo",
    sequence_id: "seq_main",
    expected_revision: 0,
    genre: "music_video",
    candidates: baseCandidates.map((c) =>
      c.asset_id === "asset_take4_close"
        ? { ...c, lip_sync: 0.92, face_visibility: 0.9, focus: 0.85 }
        : c,
    ),
  });
  assert.ok(result.scores.length === 4);
  assert.ok(result.scores.every((s) => s.result.evidence.length > 0));
  assert.ok(result.rationale.some((r) => r.includes("evidence[")));
  assert.equal(validateEditPlan(result.plan).length, 0);
  assert.equal(result.plan.constraints.preserve_master_audio, true);
  assert.ok(result.plan.operations.some((o) => o.type === "replace_clip_range"));
  assert.ok(result.plan.operations.some((o) => o.type === "adjust_grade"));
  assert.ok(result.rejected.some((r) => r.asset_id === "asset_bad_sync"));
  assert.ok(result.rejected.some((r) => r.asset_id === "asset_too_short"));
  assert.ok(result.rationale.some((line) => line.includes("asset_take4_close")));
});

test("authenticity lock skips creative grade defaults", () => {
  const result = planFirstCut({
    project_id: "proj_demo",
    sequence_id: "seq_main",
    expected_revision: 1,
    genre: "music_video",
    authenticity_lock: true,
    candidates: baseCandidates.slice(0, 2),
  });
  assert.equal(result.plan.constraints.authenticity_lock, true);
  assert.ok(!result.plan.operations.some((o) => o.type === "adjust_grade"));
  assert.ok(result.rationale.some((l) => l.includes("authenticity_lock")));
});

test("podcast policy keeps speaker-friendly min duration", () => {
  assert.ok(GENRE_POLICIES.podcast.min_shot_frames >= 36);
  const result = planFirstCut({
    project_id: "p",
    sequence_id: "s",
    expected_revision: 0,
    genre: "podcast",
    candidates: [
      {
        asset_id: "spk",
        take_id: "t1",
        sync_confidence: 0.8,
        start_frame: 0,
        end_frame: 72,
        source_in_frame: 0,
        tags: ["speaker"],
      },
    ],
  });
  assert.equal(result.plan.operations[0].type, "replace_clip_range");
});

test("empty eligible set still yields valid no-op plan", () => {
  const result = planFirstCut({
    project_id: "p",
    sequence_id: "s",
    expected_revision: 0,
    genre: "music_video",
    candidates: [
      {
        asset_id: "x",
        take_id: "t",
        sync_confidence: 0.05,
        start_frame: 0,
        end_frame: 10,
        source_in_frame: 0,
      },
    ],
  });
  assert.equal(validateEditPlan(result.plan).length, 0);
  assert.equal(result.plan.operations[0].type, "slip_clip");
});
