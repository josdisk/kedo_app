#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace kedov::audio {

struct WavAudio {
  std::int32_t sample_rate = 0;
  std::int16_t channels = 0;
  std::vector<float> mono;  // normalized -1..1 mono mixdown
};

/// Minimal PCM16 WAV reader for sync unit tests (SYN-002/003).
[[nodiscard]] WavAudio read_wav_pcm16(const std::string& path);

}  // namespace kedov::audio
