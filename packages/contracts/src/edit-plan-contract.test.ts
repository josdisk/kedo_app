import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EDIT_OPERATION_TYPES,
  EDIT_PLAN_SCHEMA_VERSION,
  EDIT_PLAN_TOP_LEVEL_KEYS,
} from "./edit-plan-contract.js";
import { isEditPlan, type EditPlan } from "./edit-plan.js";

test("EditPlan sample covers every contracted top-level key", () => {
  const sample: EditPlan = {
    schema_version: EDIT_PLAN_SCHEMA_VERSION,
    project_id: "p1",
    sequence_id: "s1",
    expected_revision: 0,
    mode: "draft_only",
    intent: "ci contract sample",
    constraints: { preserve_master_audio: true },
    operations: [
      {
        type: "adjust_grade",
        scope: "sequence",
        parameters: { exposure: 0.1 },
      },
    ],
    require_confirmation: true,
  };
  assert.equal(isEditPlan(sample), true);
  for (const key of EDIT_PLAN_TOP_LEVEL_KEYS) {
    assert.ok(key in sample, `missing ${key}`);
  }
  assert.ok(EDIT_OPERATION_TYPES.includes("adjust_grade"));
});
