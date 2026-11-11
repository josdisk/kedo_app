import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyScrubResult,
  beginScrub,
  clampFrame,
  formatTimecode,
  frameToRationalString,
  makeScrubResult,
  type Playhead,
} from "./preview-scrub.js";

const fps = { num: 24, den: 1 };

test("clampFrame respects duration", () => {
  assert.equal(clampFrame(-3, 100), 0);
  assert.equal(clampFrame(50, 100), 50);
  assert.equal(clampFrame(999, 100), 99);
});

test("frameToRationalString uses fps rational", () => {
  assert.equal(frameToRationalString(48, fps), "48/24");
  assert.equal(frameToRationalString(1, { num: 30000, den: 1001 }), "1001/30000");
});

test("formatTimecode is zero-padded", () => {
  assert.equal(formatTimecode(0, fps), "00:00:00:00");
  assert.equal(formatTimecode(24, fps), "00:00:01:00");
});

test("obsolete scrub results are rejected (PLAY-003)", () => {
  let playhead: Playhead = { frame_index: 0, fps, generation: 0 };
  playhead = beginScrub(playhead, 10); // gen 1
  const stale = makeScrubResult({ ...playhead, generation: 1, frame_index: 10 });
  playhead = beginScrub(playhead, 40); // gen 2 — cancels gen 1
  const applied = applyScrubResult(playhead, stale);
  assert.equal(applied.accepted, false);
  assert.match(applied.reason ?? "", /obsolete/);
  assert.equal(playhead.frame_index, 40);

  const fresh = makeScrubResult(playhead);
  const ok = applyScrubResult(playhead, fresh);
  assert.equal(ok.accepted, true);
  assert.equal(ok.playhead.frame_index, 40);
});
