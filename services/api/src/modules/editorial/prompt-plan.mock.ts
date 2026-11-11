import type { EditPlan } from "@kedov/contracts";

/** Local deterministic prompt→plan (mirrors AI mock adapter) for offline Nest tests. */
export function mockPromptPlan(input: {
  project_id: string;
  sequence_id: string;
  expected_revision: number;
  prompt: string;
  mode?: string;
}): EditPlan {
  const prompt = input.prompt.toLowerCase();
  const operations: EditPlan["operations"] = [];
  const mode =
    (input.mode as EditPlan["mode"]) ?? "preview_then_apply";

  if (
    prompt.includes("grade") ||
    prompt.includes("blue") ||
    prompt.includes("colour") ||
    prompt.includes("color")
  ) {
    operations.push({
      type: "adjust_grade",
      scope: "scene_inferred",
      parameters: { blue_saturation_delta: -0.08 },
    });
  }

  const takeMatch = /take\s+(\d+)/.exec(prompt);
  if (prompt.includes("replace") || prompt.includes("close-up") || takeMatch) {
    const takeN = takeMatch?.[1] ?? "4";
    operations.push({
      type: "replace_clip_range",
      target_clip_id: "clip_48",
      range: { start_frame: 2016, end_frame: 2112 },
      source_asset_id: `asset_take${takeN}_close`,
      source_in_frame: 876,
    });
  }

  if (prompt.includes("slip")) {
    operations.push({ type: "slip_clip", clip_id: "clip_48", delta_frames: -2 });
  }

  if (operations.length === 0) {
    operations.push({ type: "slip_clip", clip_id: "clip_preview", delta_frames: 0 });
  }

  return {
    schema_version: "1.0",
    project_id: input.project_id,
    sequence_id: input.sequence_id,
    expected_revision: input.expected_revision,
    mode,
    intent: input.prompt.trim(),
    constraints: {},
    operations,
    require_confirmation: mode !== "draft_only",
  };
}
