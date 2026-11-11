"""Python-level sync gold checks using the same algorithm contract as C++ (SYN-003)."""

from __future__ import annotations

import pytest

from sync_helpers import FIXTURES, correlate_offset, read_wav_mono


@pytest.mark.skipif(not (FIXTURES / "master.wav").exists(), reason="fixtures not generated")
def test_clean_delay_within_one_frame_at_24fps() -> None:
    sr, master = read_wav_mono(FIXTURES / "master.wav")
    _, clip = read_wav_mono(FIXTURES / "clip_clean_delay_400.wav")
    lag, peak, conf = correlate_offset(master, clip, 2000)
    frame_err = abs(lag) / sr * 24
    assert abs(lag - 400) <= 2
    assert conf > 0.3
    assert frame_err < 1.5
    print({"offset": lag, "peak": peak, "confidence": conf, "frame_error": frame_err})


@pytest.mark.skipif(not (FIXTURES / "master.wav").exists(), reason="fixtures not generated")
def test_noisy_delay_reports_confidence() -> None:
    _, master = read_wav_mono(FIXTURES / "master.wav")
    _, clip = read_wav_mono(FIXTURES / "clip_noisy_delay_400.wav")
    lag, peak, conf = correlate_offset(master, clip, 2000)
    assert abs(lag - 400) <= 8
    assert 0.0 <= conf <= 1.0
    print({"offset": lag, "peak": peak, "confidence": conf})
