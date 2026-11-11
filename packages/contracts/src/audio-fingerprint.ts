/** Portable audio fingerprint / landmark index (SYN-002). */

export const FINGERPRINT_ALGORITHM_VERSION = "kedov-fp-bands-onset-1.0" as const;

export interface SpectralLandmark {
  sample_index: number;
  band: number;
  strength: number;
}

export interface AudioFingerprint {
  algorithm_version: typeof FINGERPRINT_ALGORITHM_VERSION | string;
  sample_rate: number;
  frame_size: number;
  hop_size: number;
  band_count: number;
  landmarks: SpectralLandmark[];
  onset_envelope: number[];
}

export interface FingerprintMatch {
  sample_offset: number;
  score: number;
  vote_count: number;
  note: string;
}

export interface FingerprintMatchResult {
  candidates: FingerprintMatch[];
  best_offset: number;
  best_score: number;
  ambiguous: boolean;
  note: string;
}

/** Energy envelope then rectified derivative (onset proxy). */
export function onsetEnvelope(mono: number[], hop: number): number[] {
  const h = Math.max(1, Math.trunc(hop));
  const env: number[] = [];
  for (let i = 0; i < mono.length; i += h) {
    const end = Math.min(mono.length, i + h);
    let acc = 0;
    for (let j = i; j < end; j++) acc += mono[j]! * mono[j]!;
    env.push(Math.sqrt(acc / Math.max(1, end - i)));
  }
  const onset: number[] = [];
  let prev = 0;
  for (const e of env) {
    const d = e - prev;
    onset.push(d > 0 ? d : 0);
    prev = e;
  }
  return onset;
}

/**
 * Build band-energy landmarks from mono PCM using a tiny DFT (demo/portable path).
 * Prefer native `build_fingerprint` for production-length media.
 */
export function buildFingerprint(
  mono: number[],
  sampleRate: number,
  frameSize = 256,
  hopSize = 128,
  bandCount = 8,
): AudioFingerprint {
  const frame = Math.max(64, Math.trunc(frameSize));
  const hop = Math.max(32, Math.trunc(hopSize));
  const bands = Math.max(2, Math.trunc(bandCount));
  const onset_envelope = onsetEnvelope(mono, hop);
  const bandSeries: number[][] = Array.from({ length: bands }, () => []);

  for (let start = 0; start + frame <= mono.length; start += hop) {
    const mags = dftMags(mono, start, frame);
    const be = bandEnergies(mags, bands);
    for (let b = 0; b < bands; b++) bandSeries[b]!.push(be[b]!);
  }

  const landmarks: SpectralLandmark[] = [];
  for (let b = 0; b < bands; b++) {
    const series = bandSeries[b]!;
    if (series.length < 3) continue;
    const mean = series.reduce((a, v) => a + v, 0) / series.length;
    const thresh = mean * 1.35;
    for (let i = 1; i + 1 < series.length; i++) {
      const v = series[i]!;
      if (v >= series[i - 1]! && v >= series[i + 1]! && v >= thresh) {
        landmarks.push({ sample_index: i * hop, band: b, strength: v });
      }
    }
  }
  landmarks.sort(
    (a, b) => a.sample_index - b.sample_index || a.band - b.band,
  );

  return {
    algorithm_version: FINGERPRINT_ALGORITHM_VERSION,
    sample_rate: sampleRate,
    frame_size: frame,
    hop_size: hop,
    band_count: bands,
    landmarks,
    onset_envelope,
  };
}

export function matchFingerprints(
  reference: AudioFingerprint,
  query: AudioFingerprint,
  maxLagSamples: number,
): FingerprintMatchResult {
  if (!reference.landmarks.length || !query.landmarks.length) {
    return {
      candidates: [],
      best_offset: 0,
      best_score: 0,
      ambiguous: false,
      note: "insufficient landmarks",
    };
  }
  const maxLag = Math.abs(Math.trunc(maxLagSamples));
  const byBand = new Map<number, SpectralLandmark[]>();
  for (const lm of reference.landmarks) {
    const list = byBand.get(lm.band) ?? [];
    list.push(lm);
    byBand.set(lm.band, list);
  }

  const votes = new Map<number, number>();
  const hop = Math.max(1, reference.hop_size);
  for (const q of query.landmarks) {
    const refs = byBand.get(q.band) ?? [];
    for (const r of refs) {
      const offset = r.sample_index - q.sample_index;
      if (Math.abs(offset) > maxLag) continue;
      const key = Math.trunc(offset / hop) * hop;
      votes.set(key, (votes.get(key) ?? 0) + 1);
    }
  }

  if (votes.size === 0) {
    return {
      candidates: [],
      best_offset: 0,
      best_score: 0,
      ambiguous: false,
      note: "no landmark offset votes",
    };
  }

  let total = 0;
  const ranked: FingerprintMatch[] = [];
  for (const [offset, vote_count] of votes) {
    total += vote_count;
    ranked.push({
      sample_offset: offset,
      vote_count,
      score: vote_count,
      note: "landmark vote",
    });
  }
  ranked.sort(
    (a, b) =>
      b.vote_count - a.vote_count ||
      Math.abs(a.sample_offset) - Math.abs(b.sample_offset),
  );
  for (const m of ranked) m.score = m.vote_count / total;
  const top = ranked.slice(0, 8);
  const ambiguous =
    top.length >= 2 && top[1]!.vote_count / top[0]!.vote_count > 0.85;

  return {
    candidates: top,
    best_offset: top[0]!.sample_offset,
    best_score: top[0]!.score,
    ambiguous,
    note: ambiguous
      ? "fingerprint ambiguous — competing landmark peaks"
      : "ok",
  };
}

function dftMags(mono: number[], start: number, n: number): number[] {
  const bins = Math.floor(n / 2);
  const mags = new Array<number>(bins).fill(0);
  for (let k = 0; k < bins; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const ang = (-2 * Math.PI * k * t) / n;
      const x = mono[start + t]!;
      re += x * Math.cos(ang);
      im += x * Math.sin(ang);
    }
    mags[k] = Math.sqrt(re * re + im * im) / n;
  }
  return mags;
}

function bandEnergies(mags: number[], bandCount: number): number[] {
  const bands = new Array<number>(bandCount).fill(0);
  if (!mags.length) return bands;
  let edge = 1;
  for (let b = 0; b < bandCount; b++) {
    const next = edge * Math.pow(mags.length, 1 / bandCount);
    const i0 = Math.min(mags.length - 1, Math.floor(edge));
    const i1 = Math.min(mags.length, Math.ceil(next));
    let acc = 0;
    const count = Math.max(1, i1 - i0);
    for (let i = i0; i < i1; i++) acc += mags[i]!;
    bands[b] = acc / count;
    edge = next;
  }
  return bands;
}
