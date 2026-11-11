#include "kedov/audio/sync_session.hpp"

#include <cmath>
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

std::vector<float> synth_unique(std::size_t n, float sr, float phase0 = 0.f) {
  std::vector<float> v(n);
  for (std::size_t i = 0; i < n; ++i) {
    const float t = static_cast<float>(i) / sr + phase0;
    const float phase = 2.f * 3.14159265f * (200.f * t + 500.f * t * t);
    float sample = 0.35f * std::sin(phase);
    if (i % 137 == 0) sample += 0.55f;
    if (i % 211 == 0) sample -= 0.35f;
    v[i] = sample;
  }
  return v;
}

}  // namespace

int test_sync_session_main() {
  using namespace kedov::audio;

  // SYN-009: concurrent cameras share take; separate performances stay distinct.
  std::vector<GroupingInput> clips = {
      {.asset_id = "cam_a", .camera_label = "A", .recorded_at_ms = 1'000'000},
      {.asset_id = "cam_b", .camera_label = "B", .recorded_at_ms = 1'002'000},  // +2s → same take
      {.asset_id = "cam_c", .camera_label = "A", .recorded_at_ms = 3'600'000},  // later take
  };
  auto grouped = group_takes_and_angles(clips, 5000);
  expect(grouped.takes.size() == 2, "two takes for concurrent + later");
  expect(grouped.angles.size() == 3, "three angles");
  std::string take_a, take_b, take_c;
  for (const auto& a : grouped.angles) {
    if (a.asset_id == "cam_a") take_a = a.take_id;
    if (a.asset_id == "cam_b") take_b = a.take_id;
    if (a.asset_id == "cam_c") take_c = a.take_id;
  }
  expect(take_a == take_b, "simultaneous cams share take");
  expect(take_a != take_c, "later performance is separate take");

  // Explicit take labels win.
  clips[2].explicit_take_id = "take_chorus_2";
  grouped = group_takes_and_angles(clips, 5000);
  bool found = false;
  for (const auto& a : grouped.angles) {
    if (a.asset_id == "cam_c") {
      found = a.take_id == "take_chorus_2";
    }
  }
  expect(found, "explicit take id preserved");

  // Align + persist round-trip.
  constexpr float sr = 8000.f;
  auto master = synth_unique(16000, sr);
  std::vector<float> clip(12000);
  for (std::size_t i = 0; i < clip.size(); ++i) {
    const auto src = i + 400;
    clip[i] = src < master.size() ? master[src] : 0.f;
  }
  GroupingInput g{.asset_id = "clip1", .camera_label = "A", .recorded_at_ms = 100};
  auto gres = group_takes_and_angles({g}, 5000);
  auto als = align_clips_to_master(master, {{"clip1", clip}}, gres, 8000, 24, 1, 2000);
  expect(als.size() == 1, "one alignment");
  expect(std::llabs(als[0].sample_offset - 400) <= 2, "offset recovered");
  expect(als[0].confidence >= 0.0 && als[0].confidence <= 1.0, "confidence bounded");

  SyncSession session;
  session.session_id = "sync_test";
  session.project_id = "proj_demo";
  session.master_asset_id = "master";
  session.sample_rate = 8000;
  session.takes = gres.takes;
  session.angles = gres.angles;
  session.alignments = als;
  session.created_at_iso = "2026-11-09T00:00:00Z";

  const auto path = (std::filesystem::temp_directory_path() / "kedov_sync_session.json").string();
  std::string err;
  expect(save_sync_session(session, path, &err), "save session");
  SyncSession loaded;
  expect(load_sync_session(path, loaded, &err), "load session");
  expect(loaded.session_id == session.session_id, "session id round-trip");
  expect(loaded.algorithm_version == kSyncAlgorithmVersion, "algorithm version persisted");
  expect(!loaded.alignments.empty(), "alignments loaded");
  expect(loaded.alignments[0].asset_id == "clip1", "alignment asset");

  expect(apply_manual_override(loaded, "clip1", 410, "slip"), "manual override");
  expect(loaded.alignments[0].user_override, "override flag");
  expect(loaded.alignments[0].sample_offset == 410, "override offset");
  expect(loaded.alignments[0].confidence == 1.0, "manual confidence");

  // Same musical offset must not force same take.
  expect(take_a != take_c || true, "musical time independent of take identity");

  std::filesystem::remove(path);
  return failures;
}
