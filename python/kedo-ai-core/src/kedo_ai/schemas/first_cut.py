from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from kedo_ai.schemas.edit_plan import (
    AdjustGrade,
    EditPlan,
    EditPlanConstraints,
    ReplaceClipRange,
    SlipClip,
)
from kedo_ai.schemas.shot_score import ShotScoreResult, ShotSignals, score_shot

GenreId = Literal[
    "music_video",
    "wedding",
    "podcast",
    "film",
    "social",
    "church",
    "education",
    "generic",
]


class ShotCandidate(BaseModel):
    asset_id: str
    take_id: str
    angle_id: str | None = None
    sync_confidence: float = Field(ge=0.0, le=1.0)
    start_frame: int = Field(ge=0)
    end_frame: int = Field(ge=0)
    source_in_frame: int = Field(ge=0)
    score: float | None = None
    tags: list[str] = Field(default_factory=list)
    focus: float | None = None
    composition: float | None = None
    face_visibility: float | None = None
    stability: float | None = None
    action: float | None = None
    intelligibility: float | None = None
    emotional_relevance: float | None = None
    uniqueness: float | None = None
    lip_sync: float | None = None
    pinned: bool = False


class FirstCutRequest(BaseModel):
    project_id: str
    sequence_id: str
    expected_revision: int = Field(ge=0)
    genre: GenreId = "generic"
    candidates: list[ShotCandidate]
    authenticity_lock: bool = False
    target_clip_id: str = "clip_main"


class RejectedShot(BaseModel):
    asset_id: str
    reason: str


class ScoredShot(BaseModel):
    asset_id: str
    result: ShotScoreResult


class FirstCutResult(BaseModel):
    plan: EditPlan
    rationale: list[str]
    rejected: list[RejectedShot]
    scores: list[ScoredShot] = Field(default_factory=list)


_POLICIES: dict[str, dict[str, object]] = {
    "music_video": {
        "preserve_master_audio": True,
        "min_shot_frames": 24,
        "prefer_high_sync": True,
        "grade": {"saturation_delta": 0.05, "contrast_delta": 0.04},
        "description": "Prefer lip-sync-confident takes; never break master song.",
    },
    "wedding": {
        "preserve_master_audio": False,
        "min_shot_frames": 48,
        "prefer_high_sync": False,
        "grade": {"temperature_delta": 0.05},
        "description": "Chronological emotional beats.",
    },
    "podcast": {
        "preserve_master_audio": False,
        "min_shot_frames": 36,
        "prefer_high_sync": True,
        "grade": {"contrast_delta": 0.02},
        "description": "Speaker-visible angles.",
    },
    "generic": {
        "preserve_master_audio": False,
        "min_shot_frames": 24,
        "prefer_high_sync": False,
        "grade": {},
        "description": "Balanced defaults.",
    },
}


def plan_first_cut(req: FirstCutRequest) -> FirstCutResult:
    policy = _POLICIES.get(req.genre, _POLICIES["generic"])
    min_frames = int(policy["min_shot_frames"])  # type: ignore[arg-type]
    prefer_sync = bool(policy["prefer_high_sync"])
    rationale = [f"genre={req.genre}: {policy['description']}"]
    rejected: list[RejectedShot] = []
    operations: list[ReplaceClipRange | AdjustGrade | SlipClip] = []

    scored: list[ScoredShot] = []
    ranked_pairs: list[tuple[ShotCandidate, ShotScoreResult]] = []
    for c in req.candidates:
        signals = ShotSignals(
            sync_confidence=c.sync_confidence,
            focus=c.focus,
            composition=c.composition,
            face_visibility=c.face_visibility,
            stability=c.stability,
            action=c.action,
            intelligibility=c.intelligibility,
            emotional_relevance=c.emotional_relevance,
            uniqueness=c.uniqueness,
            lip_sync=c.lip_sync,
            duration_frames=c.end_frame - c.start_frame,
            min_shot_frames=min_frames,
            tags=c.tags,
            pinned=c.pinned,
        )
        result = score_shot(req.genre, signals)
        if c.score is not None:
            blended = 0.7 * result.score + 0.3 * min(1.0, max(0.0, c.score))
            result = result.model_copy(update={"score": blended})
        scored.append(ScoredShot(asset_id=c.asset_id, result=result))
        ranked_pairs.append((c, result))

    ranked_pairs.sort(key=lambda pair: (pair[1].score, pair[1].confidence), reverse=True)

    for c, result in ranked_pairs:
        dur = c.end_frame - c.start_frame
        if dur < min_frames:
            rejected.append(
                RejectedShot(asset_id=c.asset_id, reason=f"shorter than min_shot_frames={min_frames}")
            )
            continue
        if prefer_sync and c.sync_confidence < 0.4:
            rejected.append(
                RejectedShot(asset_id=c.asset_id, reason="sync_confidence below genre threshold")
            )
            continue
        operations.append(
            ReplaceClipRange(
                type="replace_clip_range",
                target_clip_id=req.target_clip_id,
                range={"start_frame": c.start_frame, "end_frame": c.end_frame},
                source_asset_id=c.asset_id,
                source_in_frame=c.source_in_frame,
            )
        )
        top = sorted(result.evidence, key=lambda e: e.contribution, reverse=True)[:3]
        evidence = ",".join(f"{e.signal}={e.value:.2f}" for e in top)
        rationale.append(
            f"select {c.asset_id} take={c.take_id} score={result.score:.3f} "
            f"conf={result.confidence:.2f} sync={c.sync_confidence:.2f} "
            f"evidence[{evidence}] frames={c.start_frame}-{c.end_frame}"
        )
        if sum(1 for o in operations if o.type == "replace_clip_range") >= 8:
            break

    has_replaces = any(o.type == "replace_clip_range" for o in operations)
    grade = dict(policy["grade"])  # type: ignore[arg-type]
    if has_replaces and grade:
        if req.authenticity_lock:
            rationale.append("authenticity_lock: skipped creative grade defaults")
        else:
            operations.append(
                AdjustGrade(type="adjust_grade", scope=f"genre_{req.genre}", parameters=grade)
            )
            rationale.append(f"apply genre grade {grade}")

    if not operations:
        operations.append(
            SlipClip(type="slip_clip", clip_id=req.target_clip_id, delta_frames=0)
        )
        rationale.append("no eligible shots — emitted no-op slip")

    plan = EditPlan(
        schema_version="1.0",
        project_id=req.project_id,
        sequence_id=req.sequence_id,
        expected_revision=req.expected_revision,
        mode="preview_then_apply",
        intent=f"First cut for genre={req.genre}",
        constraints=EditPlanConstraints(
            preserve_master_audio=bool(policy["preserve_master_audio"]),
            no_synthetic_content=True,
            authenticity_lock=req.authenticity_lock,
        ),
        operations=operations,
        require_confirmation=True,
    )
    return FirstCutResult(plan=plan, rationale=rationale, rejected=rejected, scores=scored)
