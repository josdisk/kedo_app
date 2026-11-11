import type { EditPlan, EditOperation } from "./edit-plan.js";
import { validateEditPlan } from "./edit-plan.js";

export interface SequenceSnapshot {
  sequence_id: string;
  revision: number;
  clips: Array<{
    clip_id: string;
    asset_id: string;
    track_id: string;
    start_frame: number;
    end_frame: number;
  }>;
  grade_by_scope: Record<string, Record<string, number>>;
}

export interface ApplyPlanResult {
  ok: boolean;
  errors: string[];
  sequence: SequenceSnapshot;
  applied: EditOperation[];
  skipped: Array<{ op: EditOperation; reason: string }>;
}

/**
 * Deterministic EditPlan applicator for the portable TS projection (TIM/AGT).
 * Does not mutate media files. Requires expected_revision match.
 */
export function applyEditPlan(
  sequence: SequenceSnapshot,
  plan: EditPlan,
): ApplyPlanResult {
  const errors = validateEditPlan(plan);
  if (plan.sequence_id !== sequence.sequence_id) {
    errors.push("sequence_id mismatch");
  }
  if (plan.expected_revision !== sequence.revision) {
    errors.push(
      `revision conflict: expected ${plan.expected_revision} have ${sequence.revision}`,
    );
  }
  if (errors.length) {
    return { ok: false, errors, sequence, applied: [], skipped: [] };
  }

  const next: SequenceSnapshot = {
    sequence_id: sequence.sequence_id,
    revision: sequence.revision,
    clips: sequence.clips.map((c) => ({ ...c })),
    grade_by_scope: { ...sequence.grade_by_scope },
  };
  for (const key of Object.keys(next.grade_by_scope)) {
    next.grade_by_scope[key] = { ...next.grade_by_scope[key] };
  }

  const applied: EditOperation[] = [];
  const skipped: ApplyPlanResult["skipped"] = [];

  for (const op of plan.operations) {
    if (op.type === "adjust_grade") {
      if (plan.constraints.authenticity_lock && "synthetic" in op.parameters) {
        skipped.push({ op, reason: "authenticity lock blocked synthetic grade param" });
        continue;
      }
      const prev = next.grade_by_scope[op.scope] ?? {};
      next.grade_by_scope[op.scope] = { ...prev, ...op.parameters };
      applied.push(op);
      continue;
    }

    if (op.type === "slip_clip") {
      const clip = next.clips.find((c) => c.clip_id === op.clip_id);
      if (!clip) {
        skipped.push({ op, reason: "clip not found" });
        continue;
      }
      clip.start_frame += op.delta_frames;
      clip.end_frame += op.delta_frames;
      applied.push(op);
      continue;
    }

    if (op.type === "razor_cut") {
      // Portable projection: mark applied without full track split (native Sequence handles razor).
      applied.push(op);
      continue;
    }

    if (op.type === "replace_clip_range") {
      if (plan.constraints.preserve_master_audio && op.source_asset_id.includes("master_replace")) {
        skipped.push({ op, reason: "preserve_master_audio blocked master replace" });
        continue;
      }
      const target = next.clips.find((c) => c.clip_id === op.target_clip_id);
      if (!target) {
        // Insert a derived clip on V1 for first-cut assembly.
        next.clips.push({
          clip_id: `${op.target_clip_id}_${op.source_asset_id}`,
          asset_id: op.source_asset_id,
          track_id: "V1",
          start_frame: op.range.start_frame,
          end_frame: op.range.end_frame,
        });
      } else {
        target.asset_id = op.source_asset_id;
        target.start_frame = op.range.start_frame;
        target.end_frame = op.range.end_frame;
      }
      applied.push(op);
      continue;
    }
  }

  next.revision += 1;
  return { ok: true, errors: [], sequence: next, applied, skipped };
}
