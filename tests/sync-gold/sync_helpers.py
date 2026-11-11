from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"


def read_wav_mono(path: Path) -> tuple[int, list[float]]:
    with wave.open(str(path), "rb") as wf:
        assert wf.getsampwidth() == 2
        assert wf.getnchannels() == 1
        sr = wf.getframerate()
        raw = wf.readframes(wf.getnframes())
    samples = [
        struct.unpack_from("<h", raw, i)[0] / 32768.0 for i in range(0, len(raw), 2)
    ]
    return sr, samples


def correlate_offset(
    master: list[float], clip: list[float], max_lag: int
) -> tuple[int, float, float]:
    best_lag = 0
    best = -math.inf
    second = -math.inf
    for lag in range(-max_lag, max_lag + 1):
        m0 = lag if lag >= 0 else 0
        c0 = 0 if lag >= 0 else -lag
        length = min(len(master) - m0, len(clip) - c0)
        if length < 32:
            continue
        mm = sum(master[m0 : m0 + length]) / length
        cm = sum(clip[c0 : c0 + length]) / length
        num = den_m = den_c = 0.0
        for i in range(length):
            a = master[m0 + i] - mm
            b = clip[c0 + i] - cm
            num += a * b
            den_m += a * a
            den_c += b * b
        den = math.sqrt(den_m * den_c)
        if den <= 1e-12:
            continue
        corr = num / den
        if corr > best:
            second = best
            best = corr
            best_lag = lag
        elif corr > second:
            second = corr
    confidence = max(
        0.0,
        min(1.0, 0.5 * max(0.0, best) + 0.5 * max(0.0, min(1.0, (best - second) * 2))),
    )
    return best_lag, best, confidence
