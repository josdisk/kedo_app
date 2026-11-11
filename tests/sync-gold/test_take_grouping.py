"""Take vs angle grouping + chorus ambiguity gates (SYN-004/009/010)."""

from __future__ import annotations

import math

import pytest

from sync_helpers import FIXTURES, correlate_offset, read_wav_mono


def group_takes(
    clips: list[dict],
    window_ms: int = 5000,
) -> dict[str, str]:
    asset_to_take: dict[str, str] = {}
    auto = 1
    for clip in clips:
        if clip.get("explicit_take_id"):
            asset_to_take[clip["asset_id"]] = clip["explicit_take_id"]
            continue
        assigned = None
        if clip.get("recorded_at_ms") is not None:
            for other in clips:
                if other["asset_id"] == clip["asset_id"] or other.get("recorded_at_ms") is None:
                    continue
                if abs(other["recorded_at_ms"] - clip["recorded_at_ms"]) <= window_ms:
                    assigned = asset_to_take.get(other["asset_id"])
                    if assigned:
                        break
        if not assigned:
            assigned = f"take_{auto}"
            auto += 1
        asset_to_take[clip["asset_id"]] = assigned
    return asset_to_take


def test_simultaneous_cameras_share_take_separate_from_retake() -> None:
    mapping = group_takes(
        [
            {"asset_id": "take1_cam_a", "recorded_at_ms": 1_000_000},
            {"asset_id": "take1_cam_b", "recorded_at_ms": 1_002_000},
            {"asset_id": "take2_cam_a", "recorded_at_ms": 4_000_000},
        ]
    )
    assert mapping["take1_cam_a"] == mapping["take1_cam_b"]
    assert mapping["take1_cam_a"] != mapping["take2_cam_a"]


@pytest.mark.skipif(not (FIXTURES / "take1_cam_a.wav").exists(), reason="fixtures not generated")
def test_multicam_same_offset_still_distinct_assets() -> None:
    _, master = read_wav_mono(FIXTURES / "master.wav")
    _, a = read_wav_mono(FIXTURES / "take1_cam_a.wav")
    _, b = read_wav_mono(FIXTURES / "take1_cam_b.wav")
    lag_a, _, conf_a = correlate_offset(master, a, 2000)
    lag_b, _, conf_b = correlate_offset(master, b, 2000)
    assert abs(lag_a - 400) <= 4
    assert abs(lag_b - 400) <= 8
    assert conf_a > 0.2 and conf_b > 0.2
    mapping = group_takes(
        [
            {"asset_id": "take1_cam_a", "recorded_at_ms": 1_000_000},
            {"asset_id": "take1_cam_b", "recorded_at_ms": 1_001_000},
            {"asset_id": "take2_cam_a", "recorded_at_ms": 5_000_000},
        ]
    )
    assert mapping["take1_cam_a"] == mapping["take1_cam_b"]
    assert len(set(mapping.values())) == 2


@pytest.mark.skipif(
    not (FIXTURES / "master_repeated_chorus.wav").exists(), reason="fixtures not generated"
)
def test_chorus_ambiguity_does_not_claim_near_certainty() -> None:
    _, master = read_wav_mono(FIXTURES / "master_repeated_chorus.wav")
    _, motif = read_wav_mono(FIXTURES / "clip_chorus_motif.wav")
    lag, peak, conf = correlate_offset(master, motif, 8000)
    scores = []
    for cand in range(-8000, 8001, 16):
        m0 = cand if cand >= 0 else 0
        c0 = 0 if cand >= 0 else -cand
        length = min(len(master) - m0, len(motif) - c0)
        if length < 32:
            continue
        mm = sum(master[m0 : m0 + length]) / length
        cm = sum(motif[c0 : c0 + length]) / length
        num = den_m = den_c = 0.0
        for i in range(length):
            aa = master[m0 + i] - mm
            bb = motif[c0 + i] - cm
            num += aa * bb
            den_m += aa * aa
            den_c += bb * bb
        den = math.sqrt(den_m * den_c)
        if den > 1e-12:
            scores.append(num / den)
    scores.sort(reverse=True)
    separation = scores[0] - scores[1] if len(scores) > 1 else 1.0
    ambiguous = separation < 0.05 and peak > 0.4
    if ambiguous:
        assert conf < 0.95
    assert 0.0 <= conf <= 1.0
    print({"lag": lag, "peak": peak, "conf": conf, "separation": separation, "ambiguous": ambiguous})
