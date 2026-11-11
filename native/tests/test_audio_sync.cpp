#include "kedov/audio/sync_correlate.hpp"
#include "kedov/audio/wav_reader.hpp"

#include <cmath>
#include <cstdlib>
#include <filesystem>
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

std::vector<float> synth_unique(std::size_t n, float sr) {
  std::vector<float> v(n);
  for (std::size_t i = 0; i < n; ++i) {
    const float t = static_cast<float>(i) / sr;
    // Chirp + sparse clicks — unique NCC peak (not a pure tone).
    const float phase = 2.f * 3.14159265f * (200.f * t + 500.f * t * t);
    float sample = 0.35f * std::sin(phase);
    if (i % 137 == 0) sample += 0.55f;
    if (i % 211 == 0) sample -= 0.35f;
    v[i] = sample;
  }
  return v;
}

}  // namespace

int test_audio_sync_main() {
  using namespace kedov::audio;

  constexpr float sr = 8000.f;
  auto master = synth_unique(16000, sr);
  // Clip is master delayed by 400 samples, with light noise.
  std::vector<float> clip(12000);
  for (std::size_t i = 0; i < clip.size(); ++i) {
    const auto src = i + 400;
    clip[i] = (src < master.size() ? master[src] : 0.f) + 0.01f * std::sin(static_cast<float>(i));
  }

  const auto est = correlate_offset(master, clip, 2000);
  std::cerr << "offset=" << est.sample_offset << " conf=" << est.confidence
            << " corr=" << est.peak_correlation << " note=" << est.note << "\n";
  expect(std::llabs(est.sample_offset - 400) <= 2, "clean delay recovered within 2 samples");
  expect(est.confidence > 0.4, "confidence reported");

  const double frames = sample_offset_to_frame_error(est.sample_offset, 8000, 24, 1);
  expect(std::abs(frames - (400.0 / 8000.0) * 24.0) < 0.05, "frame error conversion");

  // Repeated pattern ambiguity: two identical bursts in master.
  auto chorus = synth_unique(3000, sr);
  std::vector<float> master_rep(12000, 0.f);
  for (std::size_t i = 0; i < chorus.size(); ++i) {
    master_rep[i] = chorus[i];
    master_rep[i + 5000] = chorus[i];
  }
  const auto amb = correlate_offset(master_rep, chorus, 8000);
  expect(amb.confidence >= 0.0 && amb.confidence <= 1.0, "confidence bounded");
  // Ambiguity flag may or may not trigger depending on peak separation; never fabricate high conf.
  if (amb.ambiguous) {
    expect(amb.confidence < 0.95, "ambiguous match must not claim near-certainty");
  }

  // Optional fixture path if present.
  const std::filesystem::path fixture = std::filesystem::path("tests/sync-gold/fixtures/master.wav");
  if (std::filesystem::exists(fixture)) {
    const auto wav = read_wav_pcm16(fixture.string());
    expect(wav.sample_rate > 0 && !wav.mono.empty(), "fixture wav loads");
  }

  return failures;
}

int main() {
  extern int test_rational_time_main();
  extern int test_timeline_main();
  extern int test_ingest_main();
  extern int test_sync_session_main();
  extern int test_color_grade_main();
  extern int test_plan_apply_main();
  extern int test_proxy_encode_main();
  extern int test_preview_scrub_main();
  extern int test_drift_map_main();
  extern int test_fingerprint_main();
  extern int test_ocio_config_main();
  int f = 0;
  f += test_rational_time_main();
  f += test_timeline_main();
  f += test_audio_sync_main();
  f += test_ingest_main();
  f += test_sync_session_main();
  f += test_color_grade_main();
  f += test_plan_apply_main();
  f += test_proxy_encode_main();
  f += test_preview_scrub_main();
  f += test_drift_map_main();
  f += test_fingerprint_main();
  f += test_ocio_config_main();
  if (f != 0) {
    std::cerr << f << " assertion(s) failed\n";
    return 1;
  }
  std::cout << "All kedov_core_tests passed\n";
  return 0;
}
