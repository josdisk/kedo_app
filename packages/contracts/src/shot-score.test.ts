import assert from "node:assert/strict";
import { test } from "node:test";
import { rankShots, scoreShot } from "./shot-score.js";

test("music_video prefers lip-sync and sync over weak B-roll (EDT-002)", () => {
  const hero = scoreShot("music_video", {
    sync_confidence: 0.95,
    lip_sync: 0.94,
    face_visibility: 0.9,
    focus: 0.85,
    composition: 0.7,
    duration_frames: 72,
    min_shot_frames: 24,
    tags: ["close_up"],
  });
  const broll = scoreShot("music_video", {
    sync_confidence: 0.2,
    lip_sync: 0.1,
    face_visibility: 0.2,
    focus: 0.9,
    composition: 0.9,
    action: 0.8,
    duration_frames: 72,
    min_shot_frames: 24,
  });
  assert.ok(hero.score > broll.score);
  assert.ok(hero.evidence.some((e) => e.signal === "lip_sync"));
  assert.ok(hero.evidence.some((e) => e.signal === "sync_confidence"));
  assert.ok(hero.confidence > 0.5, "rich signals raise confidence");
});

test("podcast weights intelligibility and speaker visibility", () => {
  const speaker = scoreShot("podcast", {
    sync_confidence: 0.7,
    intelligibility: 0.95,
    face_visibility: 0.9,
    duration_frames: 48,
    min_shot_frames: 36,
    tags: ["speaker"],
  });
  assert.ok(speaker.evidence.some((e) => e.note.includes("speaker")));
  assert.ok(speaker.score > 0.6);
});

test("missing optional signals stay neutral and lower confidence", () => {
  const sparse = scoreShot("generic", {
    sync_confidence: 0.8,
    duration_frames: 48,
    min_shot_frames: 24,
  });
  const rich = scoreShot("generic", {
    sync_confidence: 0.8,
    focus: 0.8,
    composition: 0.8,
    face_visibility: 0.8,
    stability: 0.8,
    action: 0.8,
    intelligibility: 0.8,
    uniqueness: 0.8,
    emotional_relevance: 0.8,
    duration_frames: 48,
    min_shot_frames: 24,
  });
  assert.ok(rich.confidence > sparse.confidence);
  assert.ok(sparse.evidence.every((e) => e.value >= 0 && e.value <= 1));
});

test("rankShots orders by multimodal score not sync alone", () => {
  const ranked = rankShots("wedding", [
    {
      asset_id: "sync_only",
      signals: {
        sync_confidence: 0.99,
        emotional_relevance: 0.1,
        face_visibility: 0.1,
        duration_frames: 60,
        min_shot_frames: 48,
      },
    },
    {
      asset_id: "emotional",
      signals: {
        sync_confidence: 0.4,
        emotional_relevance: 0.95,
        face_visibility: 0.9,
        composition: 0.85,
        uniqueness: 0.8,
        duration_frames: 60,
        min_shot_frames: 48,
      },
    },
  ]);
  assert.equal(ranked[0]?.asset_id, "emotional");
  assert.ok(ranked[0]!.result.evidence.length >= 3);
});

test("user pin contributes evidence", () => {
  const pinned = scoreShot("generic", {
    sync_confidence: 0.5,
    pinned: true,
    duration_frames: 30,
    min_shot_frames: 24,
  });
  assert.ok(pinned.evidence.some((e) => e.signal === "user_pin" && e.value === 1));
});
