from kedo_ai.schemas.first_cut import FirstCutRequest, ShotCandidate, plan_first_cut


def test_music_video_first_cut_rejects_low_sync_and_grades() -> None:
    result = plan_first_cut(
        FirstCutRequest(
            project_id="proj_demo",
            sequence_id="seq_main",
            expected_revision=0,
            genre="music_video",
            candidates=[
                ShotCandidate(
                    asset_id="good",
                    take_id="take_1",
                    sync_confidence=0.92,
                    start_frame=0,
                    end_frame=96,
                    source_in_frame=0,
                    tags=["close_up"],
                ),
                ShotCandidate(
                    asset_id="bad",
                    take_id="take_9",
                    sync_confidence=0.1,
                    start_frame=96,
                    end_frame=200,
                    source_in_frame=0,
                ),
            ],
        )
    )
    assert result.plan.constraints.preserve_master_audio is True
    assert any(o.type == "replace_clip_range" for o in result.plan.operations)
    assert any(o.type == "adjust_grade" for o in result.plan.operations)
    assert any(r.asset_id == "bad" for r in result.rejected)
    assert len(result.scores) == 2
    assert any("evidence[" in line for line in result.rationale)


def test_authenticity_lock_skips_grade() -> None:
    result = plan_first_cut(
        FirstCutRequest(
            project_id="p",
            sequence_id="s",
            expected_revision=0,
            genre="music_video",
            authenticity_lock=True,
            candidates=[
                ShotCandidate(
                    asset_id="good",
                    take_id="t1",
                    sync_confidence=0.9,
                    start_frame=0,
                    end_frame=48,
                    source_in_frame=0,
                )
            ],
        )
    )
    assert all(o.type != "adjust_grade" for o in result.plan.operations)


def test_empty_eligible_set_emits_noop_slip() -> None:
    result = plan_first_cut(
        FirstCutRequest(
            project_id="p",
            sequence_id="s",
            expected_revision=0,
            genre="music_video",
            candidates=[
                ShotCandidate(
                    asset_id="x",
                    take_id="t",
                    sync_confidence=0.05,
                    start_frame=0,
                    end_frame=10,
                    source_in_frame=0,
                )
            ],
        )
    )
    assert len(result.plan.operations) == 1
    assert result.plan.operations[0].type == "slip_clip"
    assert result.rejected
