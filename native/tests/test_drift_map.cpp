#include "kedov/audio/drift_map.hpp"

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

}  // namespace

int test_drift_map_main() {
  using namespace kedov::audio;

  // Unity / constant offset.
  {
    DriftMap map = build_piecewise_map({
        {.source_sample = 0, .master_sample = 4800, .confidence = 1.0},
        {.source_sample = 48000, .master_sample = 52800, .confidence = 1.0},
    });
    expect(!map.has_drift, "constant offset no drift flag");
    expect(map.segments.size() == 1, "one segment");
    expect(map.segments[0].slope_num == 1 && map.segments[0].slope_den == 1, "unity slope");
    expect(map_source_to_master(map, 0) == 4800, "map @0");
    expect(map_source_to_master(map, 24000) == 28800, "map mid");
  }

  // Clock drift: source slow relative to master.
  {
    DriftMap map = build_piecewise_map({
        {.source_sample = 0, .master_sample = 100, .confidence = 0.95},
        {.source_sample = 48000, .master_sample = 48200, .confidence = 0.93},
    });
    expect(map.has_drift, "drift detected");
    expect(map.segments[0].slope_num == 481, "slope num 481");
    expect(map.segments[0].slope_den == 480, "slope den 480");
    expect(map_source_to_master(map, 0) == 100, "drift map start");
    expect(map_source_to_master(map, 48000) == 48200, "drift map end");
    expect(map.mean_abs_residual < 1.0, "low residual");
  }

  // Windowed estimate on synthetic drifted clip vs master.
  {
    constexpr int N = 8000;
    std::vector<float> master(N);
    for (int i = 0; i < N; ++i) {
      // Chirp-like unique structure.
      const float t = static_cast<float>(i) / 200.f;
      master[i] = std::sin(t * t * 0.15f) + 0.3f * std::sin(t * 3.1f);
    }
    // Clip = master with growing lag (every 2000 samples add +2 lag).
    std::vector<float> clip(N - 40, 0.f);
    for (int i = 0; i < static_cast<int>(clip.size()); ++i) {
      const int lag = 10 + (i / 2000) * 2;
      const int src = i + lag;
      if (src >= 0 && src < N) clip[static_cast<std::size_t>(i)] = master[static_cast<std::size_t>(src)];
    }
    const auto map = estimate_drift_map(master, clip, 200, 1024, 512);
    expect(!map.segments.empty(), "estimate produced segments");
    expect(!map.note.empty(), "estimate note set");
    // Mapping mid-clip should be defined (no crash / finite).
    const auto m = map_source_to_master(map, 3000);
    expect(m != 0 || map.segments[0].master_start == 0, "mapped sample produced");
  }

  return failures;
}
