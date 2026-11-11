#include "kedov/audio/fingerprint.hpp"

#include <cmath>
#include <iostream>
#include <vector>

namespace {

int failures = 0;

void expect(bool cond, const char* msg) {
  if (!cond) {
    std::cerr << "FAIL: " << msg << "\n";
    ++failures;
  }
}

std::vector<float> synth_chirp(int n, int phase = 0) {
  std::vector<float> out(static_cast<std::size_t>(n));
  for (int i = 0; i < n; ++i) {
    const float t = static_cast<float>(i + phase) / 80.f;
    out[static_cast<std::size_t>(i)] =
        std::sin(t * t * 0.2f) + 0.25f * std::sin(t * 2.7f);
  }
  return out;
}

}  // namespace

int test_fingerprint_main() {
  using namespace kedov::audio;

  {
    std::vector<float> quiet(200, 0.01f);
    std::vector<float> loud(200, 0.9f);
    quiet.insert(quiet.end(), loud.begin(), loud.end());
    const auto onset = onset_envelope(quiet, 50);
    bool any = false;
    for (float v : onset)
      if (v > 0.f) any = true;
    expect(any, "onset reacts to rise");
  }

  // Delayed clip should vote near +delay.
  {
    const auto master = synth_chirp(4096);
    const int delay = 256;
    std::vector<float> clip(master.begin() + delay, master.end());
    const auto ref = build_fingerprint(master, 48000, 256, 128, 8);
    const auto qry = build_fingerprint(clip, 48000, 256, 128, 8);
    expect(!ref.landmarks.empty(), "ref landmarks");
    expect(!qry.landmarks.empty(), "qry landmarks");
    const auto matched = match_fingerprints(ref, qry, 2000);
    expect(!matched.candidates.empty(), "candidates");
    expect(std::llabs(matched.best.sample_offset - delay) <= 256, "offset near delay");
    expect(matched.best.confidence > 0.0, "confidence > 0");
  }

  // Mild noise: fingerprint+NCC still recovers delay.
  {
    const auto master = synth_chirp(6000);
    const int delay = 400;
    std::vector<float> clip(master.begin() + delay, master.end());
    for (std::size_t i = 0; i < clip.size(); ++i) {
      clip[i] += 0.05f * std::sin(static_cast<float>(i) * 0.37f);
    }
    const auto est = fingerprint_then_correlate(master, clip, 48000, 3000);
    expect(std::llabs(est.sample_offset - delay) <= 512, "noisy recover delay");
    expect(est.confidence > 0.0, "noisy confidence");
    expect(!est.note.empty(), "note set");
  }

  return failures;
}
