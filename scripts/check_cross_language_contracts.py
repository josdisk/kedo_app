#!/usr/bin/env python3
"""Cross-language EditPlan contract check (AGT).

Compares Python Pydantic EditPlan fields against the TS contract key list
exported as packages/contracts/src/edit-plan-contract.ts.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TS_CONTRACT = ROOT / "packages" / "contracts" / "src" / "edit-plan-contract.ts"

# Ensure kedo_ai is importable when run via uv from repo root.
sys.path.insert(0, str(ROOT / "python" / "kedo-ai-core" / "src"))

from kedo_ai.schemas.edit_plan import EditPlan  # noqa: E402


def ts_top_level_keys() -> list[str]:
    text = TS_CONTRACT.read_text(encoding="utf-8")
    block = re.search(
        r"EDIT_PLAN_TOP_LEVEL_KEYS\s*=\s*\[(.*?)\]\s*as const",
        text,
        re.S,
    )
    if not block:
        raise SystemExit("EDIT_PLAN_TOP_LEVEL_KEYS not found in TS contract")
    return re.findall(r'"([^"]+)"', block.group(1))


def ts_operation_types() -> list[str]:
    text = TS_CONTRACT.read_text(encoding="utf-8")
    block = re.search(
        r"EDIT_OPERATION_TYPES\s*=\s*\[(.*?)\]\s*as const",
        text,
        re.S,
    )
    if not block:
        raise SystemExit("EDIT_OPERATION_TYPES not found in TS contract")
    return re.findall(r'"([^"]+)"', block.group(1))


def main() -> int:
    py_keys = sorted(EditPlan.model_fields.keys())
    ts_keys = sorted(ts_top_level_keys())
    if py_keys != ts_keys:
        print("EditPlan top-level key mismatch:")
        print(f"  python: {py_keys}")
        print(f"  ts:     {ts_keys}")
        return 1

    # Must match EditOperation discriminator literals in edit_plan.py.
    py_ops = sorted(
        [
            "replace_clip_range",
            "adjust_grade",
            "slip_clip",
            "razor_cut",
        ]
    )
    ts_ops = sorted(ts_operation_types())
    if py_ops != ts_ops:
        print("EditOperation type mismatch:")
        print(f"  python: {py_ops}")
        print(f"  ts:     {ts_ops}")
        return 1

    schema = EditPlan.model_json_schema()
    props = schema.get("properties", {})
    for key in ts_keys:
        if key not in props:
            print(f"JSON schema missing property: {key}")
            return 1

    print("cross-language EditPlan contract OK")
    print(f"  keys={ts_keys}")
    print(f"  ops={ts_ops}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
