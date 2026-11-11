/**
 * Shared EditPlan top-level field contract for cross-language CI (AGT).
 * Keep in sync with python/kedo_ai/schemas/edit_plan.py EditPlan.
 */
export const EDIT_PLAN_TOP_LEVEL_KEYS = [
  "schema_version",
  "project_id",
  "sequence_id",
  "expected_revision",
  "mode",
  "intent",
  "constraints",
  "operations",
  "require_confirmation",
] as const;

export type EditPlanTopLevelKey = (typeof EDIT_PLAN_TOP_LEVEL_KEYS)[number];

export const EDIT_PLAN_SCHEMA_VERSION = "1.0" as const;

export const EDIT_OPERATION_TYPES = [
  "replace_clip_range",
  "adjust_grade",
  "slip_clip",
  "razor_cut",
] as const;
