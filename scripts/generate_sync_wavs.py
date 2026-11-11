#!/usr/bin/env python3
"""Generate tiny copyright-cleared synthetic WAV fixtures for SYN tests."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests" / "sync-gold" / "fixtures"
SR = 8000


def write_mono_pcm16(path: Path, samples: list[float], sample_rate: int = SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = b"".join(
            struct.pack("<h", max(-32767, min(32767, int(s * 32767)))) for s in samples
        )
        wf.writeframes(frames)


def unique_signal(n: int) -> list[float]:
    """Non-periodic chirp + sparse clicks so NCC has a unique peak."""
    out: list[float] = []
    for i in range(n):
        t = i / SR
        # Linear chirp 200→1200 Hz
        phase = 2 * math.pi * (200 * t + 500 * t * t)
        v = 0.35 * math.sin(phase)
        # Sparse deterministic clicks
        if i % 137 == 0:
            v += 0.55
        if i % 211 == 0:
            v -= 0.35
        out.append(max(-1.0, min(1.0, v)))
    return out


def main() -> None:
    master = unique_signal(16000)
    delay = 400
    clean = [master[i + delay] if i + delay < len(master) else 0.0 for i in range(12000)]
    noisy = [
        max(-1.0, min(1.0, clean[i] + 0.04 * math.sin(i * 0.37))) for i in range(len(clean))
    ]

    # Chorus ambiguity: identical motif twice
    motif = unique_signal(3000)
    chorus_master = [0.0] * 12000
    for i, v in enumerate(motif):
        chorus_master[i] = v
        chorus_master[i + 5000] = v

    # Simultaneous multicam: same performance offset, slight mic EQ difference.
    cam_a = clean
    cam_b = [
        max(-1.0, min(1.0, clean[i] * 0.92 + 0.02 * math.sin(i * 0.11)))
        for i in range(len(clean))
    ]
    # Second take: same music alignment intent, different file identity.
    take2 = [master[i + 400] if i + 400 < len(master) else 0.0 for i in range(12000)]

    write_mono_pcm16(OUT / "master.wav", master)
    write_mono_pcm16(OUT / "clip_clean_delay_400.wav", clean)
    write_mono_pcm16(OUT / "clip_noisy_delay_400.wav", noisy)
    write_mono_pcm16(OUT / "master_repeated_chorus.wav", chorus_master)
    write_mono_pcm16(OUT / "clip_chorus_motif.wav", motif)
    write_mono_pcm16(OUT / "take1_cam_a.wav", cam_a)
    write_mono_pcm16(OUT / "take1_cam_b.wav", cam_b)
    write_mono_pcm16(OUT / "take2_cam_a.wav", take2)

    (OUT / "README.md").write_text(
        "# Sync gold fixtures\n\n"
        "Synthetic PCM16 WAVs from `scripts/generate_sync_wavs.py` (chirp + clicks).\n"
        "Expected clean offset: **400 samples** at 8 kHz.\n"
        "Take grouping: `take1_cam_*` concurrent; `take2_cam_a` separate performance.\n"
        "Chorus ambiguity: `master_repeated_chorus.wav` + `clip_chorus_motif.wav`.\n",
        encoding="utf-8",
    )
    print(f"Wrote fixtures to {OUT}")


if __name__ == "__main__":
    main()
