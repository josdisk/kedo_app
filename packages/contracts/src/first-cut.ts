import type { EditPlan, EditPlanConstraints, EditOperation } from "./edit-plan.js";
import { validateEditPlan } from "./edit-plan.js";
import { scoreShot, type ShotScoreResult, type ShotSignals } from "./shot-score.js";

export type GenreId =
  | "music_video"
  | "wedding"
  | "podcast"
  | "film"
  | "social"
  | "church"
  | "education"
  | "generic";

export interface ShotCandidate {
  asset_id: string;
  take_id: string;
  angle_id?: string;
  sync_confidence: number;
  /** Inclusive musical/timeline start frame on master clock */
  start_frame: number;
  end_frame: number;
  source_in_frame: number;
  /** Optional precomputed score; multimodal scorer overrides when signals present. */
  score?: number;
  tags?: string[];
  /** Optional multimodal signals (EDT-002). */
  focus?: number;
  composition?: number;
  face_visibility?: number;
  stability?: number;
  action?: number;
  intelligibility?: number;
  emotional_relevance?: number;
  uniqueness?: number;
  lip_sync?: number;
  pinned?: boolean;
}

export interface GenrePolicy {
  genre: GenreId;
  preserve_master_audio: boolean;
  min_shot_frames: number;
  prefer_high_sync: boolean;
  allow_synthetic: boolean;
  default_grade?: Record<string, number>;
  description: string;
}

export const GENRE_POLICIES: Record<GenreId, GenrePolicy> = {
  music_video: {
    genre: "music_video",
    preserve_master_audio: true,
    min_shot_frames: 24,
    prefer_high_sync: true,
    allow_synthetic: false,
    default_grade: { saturation_delta: 0.05, contrast_delta: 0.04 },
    description: "Prefer lip-sync-confident takes; never break master song.",
  },
  wedding: {
    genre: "wedding",
    preserve_master_audio: false,
    min_shot_frames: 48,
    prefer_high_sync: false,
    allow_synthetic: false,
    default_grade: { temperature_delta: 0.05, saturation_delta: -0.02 },
    description: "Chronological emotional beats; factuality-safe joins.",
  },
  podcast: {
    genre: "podcast",
    preserve_master_audio: false,
    min_shot_frames: 36,
    prefer_high_sync: true,
    allow_synthetic: false,
    default_grade: { contrast_delta: 0.02 },
    description: "Speaker-visible angles; preserve answer context.",
  },
  film: {
    genre: "film",
    preserve_master_audio: false,
    min_shot_frames: 24,
    prefer_high_sync: false,
    allow_synthetic: false,
    default_grade: { contrast_delta: 0.06, saturation_delta: -0.04 },
    description: "Continuity-aware coverage.",
  },
  social: {
    genre: "social",
    preserve_master_audio: false,
    min_shot_frames: 12,
    prefer_high_sync: false,
    allow_synthetic: false,
    default_grade: { saturation_delta: 0.1, contrast_delta: 0.08 },
    description: "Punchy short-form pacing.",
  },
  church: {
    genre: "church",
    preserve_master_audio: true,
    min_shot_frames: 60,
    prefer_high_sync: true,
    allow_synthetic: false,
    default_grade: { temperature_delta: -0.02 },
    description: "Long multicam service; stable switches.",
  },
  education: {
    genre: "education",
    preserve_master_audio: false,
    min_shot_frames: 48,
    prefer_high_sync: false,
    allow_synthetic: false,
    default_grade: {},
    description: "Clear chapters and intelligible framing.",
  },
  generic: {
    genre: "generic",
    preserve_master_audio: false,
    min_shot_frames: 24,
    prefer_high_sync: false,
    allow_synthetic: false,
    default_grade: {},
    description: "Balanced defaults.",
  },
};

export interface FirstCutRequest {
  project_id: string;
  sequence_id: string;
  expected_revision: number;
  genre: GenreId;
  candidates: ShotCandidate[];
  authenticity_lock?: boolean;
  target_clip_id?: string;
}

export interface FirstCutResult {
  plan: EditPlan;
  rationale: string[];
  rejected: Array<{ asset_id: string; reason: string }>;
  /** Per-candidate multimodal rankings with evidence (EDT-002). */
  scores: Array<{ asset_id: string; result: ShotScoreResult }>;
}

function candidateSignals(c: ShotCandidate, policy: GenrePolicy): ShotSignals {
  return {
    sync_confidence: c.sync_confidence,
    focus: c.focus,
    composition: c.composition,
    face_visibility: c.face_visibility,
    stability: c.stability,
    action: c.action,
    intelligibility: c.intelligibility,
    emotional_relevance: c.emotional_relevance,
    uniqueness: c.uniqueness,
    lip_sync: c.lip_sync,
    duration_frames: c.end_frame - c.start_frame,
    min_shot_frames: policy.min_shot_frames,
    tags: c.tags,
    pinned: c.pinned,
  };
}

function scoreCandidate(c: ShotCandidate, policy: GenrePolicy): ShotScoreResult {
  const multimodal = scoreShot(policy.genre, candidateSignals(c, policy));
  // Preserve explicit override score as a soft blend when provided.
  if (typeof c.score === "number" && Number.isFinite(c.score)) {
    const blended = 0.7 * multimodal.score + 0.3 * Math.min(1, Math.max(0, c.score));
    return { ...multimodal, score: blended };
  }
  return multimodal;
}

/** Deterministic genre first-cut planner → unexecuted EditPlan (EDT-001/004). */
export function planFirstCut(req: FirstCutRequest): FirstCutResult {
  const policy = GENRE_POLICIES[req.genre] ?? GENRE_POLICIES.generic;
  const rationale: string[] = [`genre=${policy.genre}: ${policy.description}`];
  const rejected: FirstCutResult["rejected"] = [];
  const operations: EditOperation[] = [];

  const scored = [...req.candidates].map((c) => ({
    c,
    result: scoreCandidate(c, policy),
  }));
  const ranked = [...scored].sort(
    (a, b) => b.result.score - a.result.score || b.result.confidence - a.result.confidence,
  );
  const scores = scored.map(({ c, result }) => ({ asset_id: c.asset_id, result }));

  for (const { c, result } of ranked) {
    const dur = c.end_frame - c.start_frame;
    if (dur < policy.min_shot_frames) {
      rejected.push({ asset_id: c.asset_id, reason: `shorter than min_shot_frames=${policy.min_shot_frames}` });
      continue;
    }
    if (policy.prefer_high_sync && c.sync_confidence < 0.4) {
      rejected.push({ asset_id: c.asset_id, reason: "sync_confidence below genre threshold" });
      continue;
    }
    operations.push({
      type: "replace_clip_range",
      target_clip_id: req.target_clip_id ?? "clip_main",
      range: { start_frame: c.start_frame, end_frame: c.end_frame },
      source_asset_id: c.asset_id,
      source_in_frame: c.source_in_frame,
    });
    const topEvidence = [...result.evidence]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map((e) => `${e.signal}=${e.value.toFixed(2)}`)
      .join(",");
    rationale.push(
      `select ${c.asset_id} take=${c.take_id} score=${result.score.toFixed(3)} conf=${result.confidence.toFixed(2)} sync=${c.sync_confidence.toFixed(2)} evidence[${topEvidence}] frames=${c.start_frame}-${c.end_frame}`,
    );
    if (operations.filter((o) => o.type === "replace_clip_range").length >= 8) break;
  }

  const hasReplaces = operations.some((o) => o.type === "replace_clip_range");
  if (
    hasReplaces &&
    policy.default_grade &&
    Object.keys(policy.default_grade).length > 0
  ) {
    if (req.authenticity_lock) {
      rationale.push("authenticity_lock: skipped creative grade defaults that could imply synthesis");
    } else {
      operations.push({
        type: "adjust_grade",
        scope: `genre_${policy.genre}`,
        parameters: { ...policy.default_grade },
      });
      rationale.push(`apply genre grade ${JSON.stringify(policy.default_grade)}`);
    }
  }

  if (operations.length === 0) {
    operations.push({
      type: "slip_clip",
      clip_id: req.target_clip_id ?? "clip_main",
      delta_frames: 0,
    });
    rationale.push("no eligible shots — emitted no-op slip for schema validity");
  }

  const constraints: EditPlanConstraints = {
    preserve_master_audio: policy.preserve_master_audio,
    no_synthetic_content: !policy.allow_synthetic || Boolean(req.authenticity_lock),
    authenticity_lock: req.authenticity_lock,
  };

  const plan: EditPlan = {
    schema_version: "1.0",
    project_id: req.project_id,
    sequence_id: req.sequence_id,
    expected_revision: req.expected_revision,
    mode: "preview_then_apply",
    intent: `First cut for genre=${policy.genre}`,
    constraints,
    operations,
    require_confirmation: true,
  };

  const errors = validateEditPlan(plan);
  if (errors.length) {
    throw new Error(`first-cut plan invalid: ${errors.join("; ")}`);
  }

  return { plan, rationale, rejected, scores };
}
