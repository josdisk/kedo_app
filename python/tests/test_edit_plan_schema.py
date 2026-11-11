from kedo_ai.schemas.edit_plan import EditPlan, validate_edit_plan


def test_prd_sample_validates() -> None:
    plan = EditPlan.model_validate(
        {
            "schema_version": "1.0",
            "project_id": "proj_demo",
            "sequence_id": "seq_main",
            "expected_revision": 43,
            "mode": "preview_then_apply",
            "intent": "Replace the chorus shot with Take 4 close-up and soften blue grade",
            "constraints": {"preserve_master_audio": True, "no_synthetic_content": True},
            "operations": [
                {
                    "type": "replace_clip_range",
                    "target_clip_id": "clip_48",
                    "range": {"start_frame": 2016, "end_frame": 2112},
                    "source_asset_id": "asset_take4_close",
                    "source_in_frame": 876,
                },
                {
                    "type": "adjust_grade",
                    "scope": "scene_chorus_2",
                    "parameters": {"blue_saturation_delta": -0.08},
                },
            ],
            "require_confirmation": False,
        }
    )
    assert validate_edit_plan(plan).project_id == "proj_demo"
