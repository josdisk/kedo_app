/** Multimodal shot scoring with evidence (EDT-002). Sync confidence is one signal among many. */

export type ScoreGenreId =
  | "music_video"
  | "wedding"
  | "podcast"
  | "film"
  | "social"
  | "church"
  | "education"
  | "generic";

export type ShotSignalName =
  | "sync_confidence"
  | "focus"
  | "composition"
  | "face_visibility"
  | "stability"
  | "action"
  | "intelligibility"
  | "emotional_relevance"
  | "uniqueness"
  | "lip_sync"
  | "duration_fit"
  | "user_pin";

export interface ShotSignals {
  sync_confidence: number;
  focus?: number;
  composition?: number;
  face_visibility?: number;
  stability?: number;
  action?: number;
  intelligibility?: number;
  emotional_relevance?: number;
  uniqueness?: number;
  lip_sync?: number;
  /** Shot length in frames; scored against genre min. */
  duration_frames?: number;
  min_shot_frames?: number;
  tags?: string[];
  pinned?: boolean;
}

export interface ScoreEvidence {
  signal: ShotSignalName;
  weight: number;
  value: number;
  contribution: number;
  note: string;
}

export interface ShotScoreResult {
  score: number;
  confidence: number;
  evidence: ScoreEvidence[];
  genre: ScoreGenreId;
}

type WeightMap = Partial<Record<ShotSignalName, number>>;

const GENRE_WEIGHTS: Record<ScoreGenreId, WeightMap> = {
  music_video: {
    sync_confidence: 0.28,
    lip_sync: 0.22,
    face_visibility: 0.12,
    focus: 0.1,
    composition: 0.08,
    action: 0.08,
    uniqueness: 0.06,
    stability: 0.04,
    emotional_relevance: 0.02,
  },
  podcast: {
    intelligibility: 0.25,
    face_visibility: 0.2,
    sync_confidence: 0.15,
    focus: 0.12,
    stability: 0.12,
    composition: 0.08,
    uniqueness: 0.05,
    emotional_relevance: 0.03,
  },
  wedding: {
    emotional_relevance: 0.22,
    face_visibility: 0.18,
    composition: 0.14,
    uniqueness: 0.12,
    focus: 0.1,
    stability: 0.1,
    action: 0.08,
    sync_confidence: 0.06,
  },
  film: {
    composition: 0.18,
    focus: 0.16,
    stability: 0.14,
    face_visibility: 0.12,
    action: 0.12,
    uniqueness: 0.1,
    emotional_relevance: 0.1,
    sync_confidence: 0.08,
  },
  social: {
    action: 0.2,
    uniqueness: 0.18,
    composition: 0.14,
    face_visibility: 0.12,
    focus: 0.12,
    emotional_relevance: 0.1,
    sync_confidence: 0.08,
    stability: 0.06,
  },
  church: {
    stability: 0.2,
    face_visibility: 0.16,
    sync_confidence: 0.16,
    intelligibility: 0.14,
    focus: 0.12,
    composition: 0.1,
    uniqueness: 0.06,
    emotional_relevance: 0.06,
  },
  education: {
    intelligibility: 0.28,
    focus: 0.18,
    face_visibility: 0.14,
    composition: 0.12,
    stability: 0.12,
    sync_confidence: 0.08,
    uniqueness: 0.04,
    emotional_relevance: 0.04,
  },
  generic: {
    sync_confidence: 0.2,
    focus: 0.15,
    composition: 0.15,
    face_visibility: 0.1,
    stability: 0.1,
    action: 0.1,
    intelligibility: 0.08,
    uniqueness: 0.07,
    emotional_relevance: 0.05,
  },
};

function clamp01(v: number | undefined, fallback = 0.5): number {
  if (v == null || !Number.isFinite(v)) return fallback;
  return Math.min(1, Math.max(0, v));
}

function optionalSignal(signals: ShotSignals, name: ShotSignalName): number | undefined {
  switch (name) {
    case "focus":
      return signals.focus;
    case "composition":
      return signals.composition;
    case "face_visibility":
      return signals.face_visibility;
    case "stability":
      return signals.stability;
    case "action":
      return signals.action;
    case "intelligibility":
      return signals.intelligibility;
    case "emotional_relevance":
      return signals.emotional_relevance;
    case "uniqueness":
      return signals.uniqueness;
    case "lip_sync":
      return signals.lip_sync;
    default:
      return undefined;
  }
}

function signalValue(signals: ShotSignals, name: ShotSignalName): { value: number; note: string } {
  switch (name) {
    case "sync_confidence":
      return { value: clamp01(signals.sync_confidence, 0), note: "audio/video sync confidence" };
    case "focus":
      return { value: clamp01(signals.focus), note: "sharpness / focus estimate" };
    case "composition":
      return { value: clamp01(signals.composition), note: "framing / composition estimate" };
    case "face_visibility":
      return { value: clamp01(signals.face_visibility), note: "face/subject visibility" };
    case "stability":
      return { value: clamp01(signals.stability), note: "camera stability" };
    case "action":
      return { value: clamp01(signals.action), note: "motion / action energy" };
    case "intelligibility":
      return { value: clamp01(signals.intelligibility), note: "speech/visual intelligibility" };
    case "emotional_relevance":
      return { value: clamp01(signals.emotional_relevance), note: "emotional beat relevance" };
    case "uniqueness":
      return { value: clamp01(signals.uniqueness), note: "shot uniqueness vs peers" };
    case "lip_sync":
      return {
        value: clamp01(signals.lip_sync ?? signals.sync_confidence * 0.9),
        note: "lip-sync / mouth alignment",
      };
    case "duration_fit": {
      const dur = signals.duration_frames ?? 0;
      const min = signals.min_shot_frames ?? 24;
      if (dur <= 0) return { value: 0.4, note: "duration unknown" };
      if (dur < min) return { value: Math.max(0, dur / min) * 0.5, note: `shorter than min ${min}` };
      return { value: 1, note: `duration ${dur} >= min ${min}` };
    }
    case "user_pin":
      return {
        value: signals.pinned ? 1 : 0,
        note: signals.pinned ? "user pinned" : "not pinned",
      };
    default:
      return { value: 0.5, note: "unknown" };
  }
}

/** Tag boosts (small, explained) — never invent confidence. */
function tagBoosts(genre: ScoreGenreId, tags: string[] | undefined): ScoreEvidence[] {
  const evidence: ScoreEvidence[] = [];
  const t = new Set(tags ?? []);
  if (genre === "music_video" && t.has("close_up")) {
    evidence.push({
      signal: "face_visibility",
      weight: 0.05,
      value: 1,
      contribution: 0.05,
      note: "tag close_up boost for music_video",
    });
  }
  if (genre === "podcast" && t.has("speaker")) {
    evidence.push({
      signal: "intelligibility",
      weight: 0.05,
      value: 1,
      contribution: 0.05,
      note: "tag speaker boost for podcast",
    });
  }
  return evidence;
}

/**
 * Score a shot with multimodal signals and per-evidence contributions (EDT-002).
 * Missing optional signals fall back to neutral 0.5 — never fabricated high confidence.
 */
export function scoreShot(genre: ScoreGenreId, signals: ShotSignals): ShotScoreResult {
  const weights = GENRE_WEIGHTS[genre] ?? GENRE_WEIGHTS.generic;
  const evidence: ScoreEvidence[] = [];
  let weighted = 0;
  let weightSum = 0;
  let present = 0;
  let specifiedOptional = 0;
  let optionalCount = 0;

  const entries = Object.entries(weights) as Array<[ShotSignalName, number]>;
  for (const [signal, weight] of entries) {
    if (!weight || weight <= 0) continue;
    const { value, note } = signalValue(signals, signal);
    const contribution = weight * value;
    evidence.push({ signal, weight, value, contribution, note });
    weighted += contribution;
    weightSum += weight;
    present += 1;
    if (signal !== "sync_confidence" && signal !== "duration_fit" && signal !== "user_pin") {
      optionalCount += 1;
      const optionalValue = optionalSignal(signals, signal);
      if (optionalValue != null) specifiedOptional += 1;
    }
  }

  // Duration fit always considered.
  {
    const { value, note } = signalValue(signals, "duration_fit");
    const weight = 0.08;
    const contribution = weight * value;
    evidence.push({ signal: "duration_fit", weight, value, contribution, note });
    weighted += contribution;
    weightSum += weight;
  }

  if (signals.pinned) {
    const { value, note } = signalValue(signals, "user_pin");
    const weight = 0.2;
    const contribution = weight * value;
    evidence.push({ signal: "user_pin", weight, value, contribution, note });
    weighted += contribution;
    weightSum += weight;
  }

  for (const boost of tagBoosts(genre, signals.tags)) {
    evidence.push(boost);
    weighted += boost.contribution;
    weightSum += boost.weight;
  }

  const score = weightSum > 0 ? weighted / weightSum : 0;
  // Confidence rises when more optional multimodal signals are actually provided.
  const coverage = optionalCount === 0 ? 0.5 : specifiedOptional / optionalCount;
  const confidence = clamp01(0.35 + 0.5 * coverage + 0.15 * clamp01(signals.sync_confidence, 0));

  return {
    score: clamp01(score),
    confidence: clamp01(confidence),
    evidence,
    genre,
  };
}

export function rankShots(
  genre: ScoreGenreId,
  shots: Array<{ asset_id: string; signals: ShotSignals }>,
): Array<{ asset_id: string; result: ShotScoreResult }> {
  return shots
    .map((s) => ({ asset_id: s.asset_id, result: scoreShot(genre, s.signals) }))
    .sort((a, b) => b.result.score - a.result.score || b.result.confidence - a.result.confidence);
}
