"""Multimodal shot scoring with evidence (EDT-002)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ScoreGenreId = Literal[
    "music_video",
    "wedding",
    "podcast",
    "film",
    "social",
    "church",
    "education",
    "generic",
]

ShotSignalName = Literal[
    "sync_confidence",
    "focus",
    "composition",
    "face_visibility",
    "stability",
    "action",
    "intelligibility",
    "emotional_relevance",
    "uniqueness",
    "lip_sync",
    "duration_fit",
    "user_pin",
]


class ShotSignals(BaseModel):
    sync_confidence: float = Field(ge=0.0, le=1.0)
    focus: float | None = None
    composition: float | None = None
    face_visibility: float | None = None
    stability: float | None = None
    action: float | None = None
    intelligibility: float | None = None
    emotional_relevance: float | None = None
    uniqueness: float | None = None
    lip_sync: float | None = None
    duration_frames: int | None = None
    min_shot_frames: int | None = None
    tags: list[str] = Field(default_factory=list)
    pinned: bool = False


class ScoreEvidence(BaseModel):
    signal: ShotSignalName
    weight: float
    value: float
    contribution: float
    note: str


class ShotScoreResult(BaseModel):
    score: float
    confidence: float
    evidence: list[ScoreEvidence]
    genre: ScoreGenreId


_GENRE_WEIGHTS: dict[str, dict[str, float]] = {
    "music_video": {
        "sync_confidence": 0.28,
        "lip_sync": 0.22,
        "face_visibility": 0.12,
        "focus": 0.1,
        "composition": 0.08,
        "action": 0.08,
        "uniqueness": 0.06,
        "stability": 0.04,
        "emotional_relevance": 0.02,
    },
    "podcast": {
        "intelligibility": 0.25,
        "face_visibility": 0.2,
        "sync_confidence": 0.15,
        "focus": 0.12,
        "stability": 0.12,
        "composition": 0.08,
        "uniqueness": 0.05,
        "emotional_relevance": 0.03,
    },
    "wedding": {
        "emotional_relevance": 0.22,
        "face_visibility": 0.18,
        "composition": 0.14,
        "uniqueness": 0.12,
        "focus": 0.1,
        "stability": 0.1,
        "action": 0.08,
        "sync_confidence": 0.06,
    },
    "generic": {
        "sync_confidence": 0.2,
        "focus": 0.15,
        "composition": 0.15,
        "face_visibility": 0.1,
        "stability": 0.1,
        "action": 0.1,
        "intelligibility": 0.08,
        "uniqueness": 0.07,
        "emotional_relevance": 0.05,
    },
}


def _clamp01(v: float | None, fallback: float = 0.5) -> float:
    if v is None:
        return fallback
    return min(1.0, max(0.0, float(v)))


def _signal_value(signals: ShotSignals, name: str) -> tuple[float, str]:
    if name == "sync_confidence":
        return _clamp01(signals.sync_confidence, 0.0), "audio/video sync confidence"
    if name == "lip_sync":
        base = signals.lip_sync if signals.lip_sync is not None else signals.sync_confidence * 0.9
        return _clamp01(base), "lip-sync / mouth alignment"
    if name == "duration_fit":
        dur = signals.duration_frames or 0
        minimum = signals.min_shot_frames or 24
        if dur <= 0:
            return 0.4, "duration unknown"
        if dur < minimum:
            return max(0.0, (dur / minimum) * 0.5), f"shorter than min {minimum}"
        return 1.0, f"duration {dur} >= min {minimum}"
    if name == "user_pin":
        return (1.0 if signals.pinned else 0.0), ("user pinned" if signals.pinned else "not pinned")
    mapping = {
        "focus": (signals.focus, "sharpness / focus estimate"),
        "composition": (signals.composition, "framing / composition estimate"),
        "face_visibility": (signals.face_visibility, "face/subject visibility"),
        "stability": (signals.stability, "camera stability"),
        "action": (signals.action, "motion / action energy"),
        "intelligibility": (signals.intelligibility, "speech/visual intelligibility"),
        "emotional_relevance": (signals.emotional_relevance, "emotional beat relevance"),
        "uniqueness": (signals.uniqueness, "shot uniqueness vs peers"),
    }
    raw, note = mapping.get(name, (None, "unknown"))
    return _clamp01(raw), note


def score_shot(genre: ScoreGenreId, signals: ShotSignals) -> ShotScoreResult:
    weights = _GENRE_WEIGHTS.get(genre, _GENRE_WEIGHTS["generic"])
    evidence: list[ScoreEvidence] = []
    weighted = 0.0
    weight_sum = 0.0
    optional_names = [
        "focus",
        "composition",
        "face_visibility",
        "stability",
        "action",
        "intelligibility",
        "emotional_relevance",
        "uniqueness",
        "lip_sync",
    ]
    specified = 0
    for signal, weight in weights.items():
        if weight <= 0:
            continue
        value, note = _signal_value(signals, signal)
        contribution = weight * value
        evidence.append(
            ScoreEvidence(
                signal=signal,  # type: ignore[arg-type]
                weight=weight,
                value=value,
                contribution=contribution,
                note=note,
            )
        )
        weighted += contribution
        weight_sum += weight
        if signal in optional_names and getattr(signals, signal) is not None:
            specified += 1

    value, note = _signal_value(signals, "duration_fit")
    evidence.append(
        ScoreEvidence(
            signal="duration_fit",
            weight=0.08,
            value=value,
            contribution=0.08 * value,
            note=note,
        )
    )
    weighted += 0.08 * value
    weight_sum += 0.08

    if signals.pinned:
        value, note = _signal_value(signals, "user_pin")
        evidence.append(
            ScoreEvidence(
                signal="user_pin",
                weight=0.2,
                value=value,
                contribution=0.2 * value,
                note=note,
            )
        )
        weighted += 0.2 * value
        weight_sum += 0.2

    tags = set(signals.tags)
    if genre == "music_video" and "close_up" in tags:
        evidence.append(
            ScoreEvidence(
                signal="face_visibility",
                weight=0.05,
                value=1.0,
                contribution=0.05,
                note="tag close_up boost for music_video",
            )
        )
        weighted += 0.05
        weight_sum += 0.05
    if genre == "podcast" and "speaker" in tags:
        evidence.append(
            ScoreEvidence(
                signal="intelligibility",
                weight=0.05,
                value=1.0,
                contribution=0.05,
                note="tag speaker boost for podcast",
            )
        )
        weighted += 0.05
        weight_sum += 0.05

    score = weighted / weight_sum if weight_sum else 0.0
    coverage = specified / max(1, len(optional_names))
    confidence = _clamp01(0.35 + 0.5 * coverage + 0.15 * _clamp01(signals.sync_confidence, 0.0))
    return ShotScoreResult(
        score=_clamp01(score),
        confidence=_clamp01(confidence),
        evidence=evidence,
        genre=genre if genre in _GENRE_WEIGHTS else "generic",  # type: ignore[arg-type]
    )
