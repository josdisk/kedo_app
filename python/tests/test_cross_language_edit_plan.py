"""Cross-language EditPlan field parity (AGT)."""

from pathlib import Path
import re

from kedo_ai.schemas.edit_plan import EditPlan

ROOT = Path(__file__).resolve().parents[2]
TS_CONTRACT = ROOT / "packages" / "contracts" / "src" / "edit-plan-contract.ts"


def _ts_keys() -> list[str]:
    text = TS_CONTRACT.read_text(encoding="utf-8")
    block = re.search(
        r"EDIT_PLAN_TOP_LEVEL_KEYS\s*=\s*\[(.*?)\]\s*as const",
        text,
        re.S,
    )
    assert block, "EDIT_PLAN_TOP_LEVEL_KEYS missing"
    return sorted(re.findall(r'"([^"]+)"', block.group(1)))


def test_edit_plan_fields_match_ts_contract():
    py_keys = sorted(EditPlan.model_fields.keys())
    assert py_keys == _ts_keys()


def test_edit_plan_json_schema_has_contract_keys():
    props = EditPlan.model_json_schema().get("properties", {})
    for key in _ts_keys():
        assert key in props
