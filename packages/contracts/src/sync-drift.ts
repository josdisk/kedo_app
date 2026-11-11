/** Piecewise affine sync drift maps (SYN-005 / §5.1). */

export interface AffineSegment {
  source_start: number;
  source_end: number;
  master_start: number;
  slope_num: number;
  slope_den: number;
  uncertainty_samples: number;
}

export interface DriftAnchor {
  source_sample: number;
  master_sample: number;
  confidence: number;
}

export interface DriftMap {
  segments: AffineSegment[];
  note: string;
  mean_abs_residual: number;
  has_drift: boolean;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0 ? 1 : x;
}

export function reduceSlope(num: number, den: number): { num: number; den: number } {
  let n = Math.trunc(num);
  let d = Math.trunc(den);
  if (d === 0) return { num: 1, den: 1 };
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  n = Math.trunc(n / g);
  d = Math.trunc(d / g);
  if (n === 0) d = 1;
  return { num: n, den: d };
}

export function mapSourceToMaster(map: DriftMap, sourceSample: number): number {
  if (map.segments.length === 0) return sourceSample;
  let chosen = map.segments[0]!;
  for (const seg of map.segments) {
    if (sourceSample >= seg.source_start && sourceSample <= seg.source_end) {
      chosen = seg;
      break;
    }
    if (sourceSample > seg.source_end) chosen = seg;
  }
  const delta = sourceSample - chosen.source_start;
  return chosen.master_start + Math.trunc((delta * chosen.slope_num) / chosen.slope_den);
}

export function fitLinearSegment(a: DriftAnchor, b: DriftAnchor): AffineSegment {
  const left = a.source_sample <= b.source_sample ? a : b;
  const right = a.source_sample <= b.source_sample ? b : a;
  const ds = right.source_sample - left.source_sample;
  const dm = right.master_sample - left.master_sample;
  const slope = ds === 0 ? { num: 1, den: 1 } : reduceSlope(dm, ds);
  const conf = Math.min(left.confidence, right.confidence);
  const uncertainty = conf >= 0.9 ? 1 : conf >= 0.7 ? 4 : conf >= 0.4 ? 16 : 64;
  return {
    source_start: left.source_sample,
    source_end: right.source_sample,
    master_start: left.master_sample,
    slope_num: slope.num,
    slope_den: slope.den,
    uncertainty_samples: uncertainty,
  };
}

export function buildPiecewiseMap(anchorsIn: DriftAnchor[]): DriftMap {
  if (anchorsIn.length === 0) {
    return { segments: [], note: "no anchors", mean_abs_residual: 0, has_drift: false };
  }
  const sorted = [...anchorsIn].sort((x, y) => x.source_sample - y.source_sample);
  const uniq: DriftAnchor[] = [];
  for (const a of sorted) {
    const last = uniq[uniq.length - 1];
    if (last && last.source_sample === a.source_sample) {
      if (a.confidence >= last.confidence) uniq[uniq.length - 1] = a;
      continue;
    }
    uniq.push(a);
  }

  if (uniq.length === 1) {
    const only = uniq[0]!;
    return {
      segments: [
        {
          source_start: only.source_sample,
          source_end: only.source_sample,
          master_start: only.master_sample,
          slope_num: 1,
          slope_den: 1,
          uncertainty_samples: 0,
        },
      ],
      note: "single anchor — constant offset (unity slope)",
      mean_abs_residual: 0,
      has_drift: false,
    };
  }

  const segments: AffineSegment[] = [];
  let has_drift = false;
  for (let i = 0; i + 1 < uniq.length; i++) {
    const seg = fitLinearSegment(uniq[i]!, uniq[i + 1]!);
    if (seg.slope_num !== seg.slope_den) has_drift = true;
    segments.push(seg);
  }

  const map: DriftMap = {
    segments,
    note: has_drift ? "piecewise affine drift map" : "piecewise unity / constant offset",
    mean_abs_residual: 0,
    has_drift,
  };
  let acc = 0;
  for (const a of uniq) {
    acc += Math.abs(mapSourceToMaster(map, a.source_sample) - a.master_sample);
  }
  map.mean_abs_residual = acc / uniq.length;
  return map;
}

/** Constant-offset map (no drift) for a single sample_offset. */
export function constantOffsetMap(
  sampleOffset: number,
  sourceEnd: number,
): DriftMap {
  return buildPiecewiseMap([
    { source_sample: 0, master_sample: sampleOffset, confidence: 1 },
    {
      source_sample: Math.max(0, Math.trunc(sourceEnd)),
      master_sample: Math.max(0, Math.trunc(sourceEnd)) + sampleOffset,
      confidence: 1,
    },
  ]);
}
