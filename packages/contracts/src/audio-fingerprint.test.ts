import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFingerprint,
  matchFingerprints,
  onsetEnvelope,
} from "./audio-fingerprint.js";

function synthChirp(n: number, phase = 0): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = (i + phase) / 80;
    out[i] = Math.sin(t * t * 0.2) + 0.25 * Math.sin(t * 2.7);
  }
  return out;
}

test("onsetEnvelope reacts to energy rises", () => {
  const mono = [...new Array(200).fill(0.01), ...new Array(200).fill(0.9)];
  const onset = onsetEnvelope(mono, 50);
  assert.ok(onset.some((v) => v > 0));
});

test("fingerprint landmarks match delayed clip (SYN-002)", () => {
  const master = synthChirp(4096);
  const delay = 256;
  const clip = master.slice(delay);
  const ref = buildFingerprint(master, 48000, 256, 128, 8);
  const qry = buildFingerprint(clip, 48000, 256, 128, 8);
  assert.ok(ref.landmarks.length > 0, "reference landmarks");
  assert.ok(qry.landmarks.length > 0, "query landmarks");

  const matched = matchFingerprints(ref, qry, 2000);
  assert.ok(matched.candidates.length > 0, "candidates");
  // Best offset should be near +delay (query starts later in master time).
  assert.ok(
    Math.abs(matched.best_offset - delay) <= 256,
    `offset ${matched.best_offset} near ${delay}`,
  );
  assert.ok(matched.best_score > 0);
});

test("empty fingerprints yield structured miss", () => {
  const matched = matchFingerprints(
    {
      algorithm_version: "kedov-fp-bands-onset-1.0",
      sample_rate: 48000,
      frame_size: 256,
      hop_size: 128,
      band_count: 8,
      landmarks: [],
      onset_envelope: [],
    },
    {
      algorithm_version: "kedov-fp-bands-onset-1.0",
      sample_rate: 48000,
      frame_size: 256,
      hop_size: 128,
      band_count: 8,
      landmarks: [],
      onset_envelope: [],
    },
    1000,
  );
  assert.equal(matched.candidates.length, 0);
  assert.match(matched.note, /insufficient/);
});
