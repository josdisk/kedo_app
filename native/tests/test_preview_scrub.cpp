#include "kedov/io/frame_extract.hpp"

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>

namespace {

int failures = 0;

void expect(bool cond, const char* msg) {
  if (!cond) {
    std::cerr << "FAIL: " << msg << "\n";
    ++failures;
  }
}

std::filesystem::path fixture_fake_ffmpeg() {
  return std::filesystem::path(KEDOV_NATIVE_SOURCE_DIR) / "tests" / "fixtures" / "fake_ffmpeg.sh";
}

}  // namespace

int test_preview_scrub_main() {
  kedov::io::ScrubRequest req;
  req.source_path = "/media/a.mov";
  req.output_ppm = "/cache/a_f12.ppm";
  req.frame_index = 12;
  req.fps_num = 24;
  req.fps_den = 1;
  const auto argv = kedov::io::build_scrub_ffmpeg_argv(req, "/usr/bin/ffmpeg");
  expect(argv[0] == "/usr/bin/ffmpeg", "argv0 ffmpeg");
  bool saw_ss = false;
  for (std::size_t i = 0; i + 1 < argv.size(); ++i) {
    if (argv[i] == "-ss") {
      saw_ss = true;
      expect(argv[i + 1] == "0.500000", "seek 12/24s");
    }
  }
  expect(saw_ss, "has -ss");
  expect(argv.back() == req.output_ppm.string(), "ppm last");
  expect(req.source_path != req.output_ppm, "never in-place");

  kedov::io::ScrubScheduler sched;
  const auto g1 = sched.begin_scrub();
  const auto g2 = sched.begin_scrub();
  expect(g2 == g1 + 1, "generation bumps");
  expect(!sched.is_current(g1), "older generation obsolete");
  expect(sched.is_current(g2), "latest current");

  const auto tmp = std::filesystem::temp_directory_path() / "kedov_preview_scrub_test";
  std::filesystem::remove_all(tmp);
  std::filesystem::create_directories(tmp);
  const auto source = tmp / "clip.mov";
  const auto out1 = tmp / "f10.ppm";
  const auto out2 = tmp / "f20.ppm";
  std::ofstream(source) << "demo-source-PLAY-003";

  ::setenv("KEDOV_FFMPEG", fixture_fake_ffmpeg().string().c_str(), 1);

  kedov::io::ScrubRequest r1;
  r1.generation = sched.begin_scrub();
  r1.source_path = source;
  r1.output_ppm = out1;
  r1.frame_index = 10;
  // Supersede before run — obsolete cancel path.
  kedov::io::ScrubRequest r2 = r1;
  r2.generation = sched.begin_scrub();
  r2.output_ppm = out2;
  r2.frame_index = 20;

  const auto cancelled = sched.run_if_current(r1);
  expect(!cancelled.ok, "obsolete scrub cancelled");
  expect(cancelled.message.find("obsolete") != std::string::npos, "obsolete message");

  const auto ok = sched.run_if_current(r2);
  expect(ok.ok, "current scrub extracts");
  expect(std::filesystem::exists(out2), "ppm written");
  expect(ok.frame_index == 20, "frame index");

  ::unsetenv("KEDOV_FFMPEG");
  std::filesystem::remove_all(tmp);
  return failures;
}
