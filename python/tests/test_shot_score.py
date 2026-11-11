from kedo_ai.schemas.shot_score import ShotSignals, score_shot


def test_music_video_prefers_lip_sync_over_pretty_broll() -> None:
    hero = score_shot(
        "music_video",
        ShotSignals(
            sync_confidence=0.95,
            lip_sync=0.94,
            face_visibility=0.9,
            focus=0.85,
            duration_frames=72,
            min_shot_frames=24,
            tags=["close_up"],
        ),
    )
    broll = score_shot(
        "music_video",
        ShotSignals(
            sync_confidence=0.2,
            lip_sync=0.1,
            face_visibility=0.2,
            focus=0.9,
            composition=0.9,
            duration_frames=72,
            min_shot_frames=24,
        ),
    )
    assert hero.score > broll.score
    assert any(e.signal == "lip_sync" for e in hero.evidence)
    assert hero.confidence > 0.5


def test_sparse_signals_have_lower_confidence() -> None:
    sparse = score_shot("generic", ShotSignals(sync_confidence=0.8, duration_frames=48, min_shot_frames=24))
    rich = score_shot(
        "generic",
        ShotSignals(
            sync_confidence=0.8,
            focus=0.8,
            composition=0.8,
            face_visibility=0.8,
            stability=0.8,
            action=0.8,
            intelligibility=0.8,
            uniqueness=0.8,
            emotional_relevance=0.8,
            duration_frames=48,
            min_shot_frames=24,
        ),
    )
    assert rich.confidence > sparse.confidence
