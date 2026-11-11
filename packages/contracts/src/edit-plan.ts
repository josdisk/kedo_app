/** Typed EditPlan — LLM output must validate against this before any apply (AGT / §8.5). */

export type EditPlanMode = "preview_then_apply" | "apply_with_confirmation" | "draft_only";

export interface FrameRange {
  start_frame: number;
  end_frame: number;
}

export type EditOperation =
  | {
      type: "replace_clip_range";
      target_clip_id: string;
      range: FrameRange;
      source_asset_id: string;
      source_in_frame: number;
    }
  | {
      type: "adjust_grade";
      scope: string;
      parameters: Record<string, number>;
    }
  | {
      type: "slip_clip";
      clip_id: string;
      delta_frames: number;
    }
  | {
      type: "razor_cut";
      track_id: string;
      at_frame: number;
    };

export interface EditPlanConstraints {
  preserve_master_audio?: boolean;
  no_synthetic_content?: boolean;
  authenticity_lock?: boolean;
}

export interface EditPlan {
  schema_version: "1.0";
  project_id: string;
  sequence_id: string;
  expected_revision: number;
  mode: EditPlanMode;
  intent: string;
  constraints: EditPlanConstraints;
  operations: EditOperation[];
  require_confirmation: boolean;
}

export interface ProjectSummary {
  id: string;
  name: string;
  genre: string;
  privacy_mode: string;
  revision: number;
  updated_at: string;
}

export function isEditPlan(value: unknown): value is EditPlan {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schema_version === "1.0" &&
    typeof v.project_id === "string" &&
    typeof v.sequence_id === "string" &&
    typeof v.expected_revision === "number" &&
    typeof v.intent === "string" &&
    Array.isArray(v.operations) &&
    typeof v.require_confirmation === "boolean"
  );
}

export function validateEditPlan(plan: EditPlan): string[] {
  const errors: string[] = [];
  if (!plan.project_id) errors.push("project_id required");
  if (!plan.sequence_id) errors.push("sequence_id required");
  if (plan.expected_revision < 0) errors.push("expected_revision must be >= 0");
  if (plan.operations.length === 0) errors.push("operations must not be empty");
  if (plan.operations.length > 64) errors.push("operations exceed max of 64");
  for (const [i, op] of plan.operations.entries()) {
    if (op.type === "replace_clip_range") {
      if (op.range.end_frame < op.range.start_frame) {
        errors.push(`operations[${i}].range end before start`);
      }
    }
  }
  return errors;
}
