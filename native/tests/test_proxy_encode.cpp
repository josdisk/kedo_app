#include "kedov/io/proxy_job.hpp"

#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>

namespace {

int failures = 0;

void expect(bool cond, const char* msg) {
  if (!cond) {
    std::cerr << "FAIL: " << msg << "\n";
    ++failures;
  }
}

std::filesystem::path fixture_fake_ffmpeg() {
  // tests/ are next to fixtures when run from build dir via relative path from source.
  return std::filesystem::path(KEDOV_NATIVE_SOURCE_DIR) / "tests" / "fixtures" / "fake_ffmpeg.sh";
}

}  // namespace

int test_proxy_encode_main() {
  expect(kedov::io::proxy_scale_filter(720) == "scale=-2:720", "scale filter 720");
  expect(kedov::io::proxy_scale_filter(50) == "scale=-2:120", "scale clamps low");

  kedov::io::ProxyJobSpec spec;
  spec.job_id = "proxy_test";
  spec.project_id = "p";
  spec.asset_id = "a";
  spec.source_path = "/tmp/source.mov";
  spec.output_path = "/tmp/proxy.mp4";
  spec.target_height = 720;
  spec.video_codec = "mpeg4";

  const auto argv = kedov::io::build_proxy_ffmpeg_argv(spec, "/usr/bin/ffmpeg");
  expect(!argv.empty() && argv[0] == "/usr/bin/ffmpeg", "argv0 is ffmpeg");
  bool saw_i = false;
  bool saw_vf = false;
  bool saw_y = false;
  for (std::size_t i = 0; i + 1 < argv.size(); ++i) {
    if (argv[i] == "-i") {
      saw_i = true;
      expect(argv[i + 1] == spec.source_path.string(), "input is source");
    }
    if (argv[i] == "-vf") {
      saw_vf = true;
      expect(argv[i + 1] == "scale=-2:720", "vf scale");
    }
    if (argv[i] == "-y") saw_y = true;
  }
  expect(saw_i && saw_vf && saw_y, "required flags present");
  expect(argv.back() == spec.output_path.string(), "output last");
  // Source path must not equal output (never in-place).
  expect(spec.source_path != spec.output_path, "proxy output is separate path");

  const auto tmp = std::filesystem::temp_directory_path() / "kedov_proxy_encode_test";
  std::filesystem::remove_all(tmp);
  std::filesystem::create_directories(tmp);
  const auto source = tmp / "cam_a.mov";
  const auto proxy = tmp / "proxies" / "cam_a_720.mp4";
  {
    std::ofstream(source) << "demo-source-bytes-ING-008";
  }
  const auto source_sha_before = std::filesystem::file_size(source);

  const auto fake = fixture_fake_ffmpeg();
  expect(std::filesystem::exists(fake), "fake_ffmpeg fixture present");
  ::setenv("KEDOV_FFMPEG", fake.string().c_str(), 1);

  kedov::io::ProxyJobSpec enc;
  enc.job_id = "proxy_demo";
  enc.source_path = source;
  enc.output_path = proxy;
  enc.target_height = 540;
  enc.video_codec = "mpeg4";

  const auto result = kedov::io::encode_proxy(enc);
  expect(result.ok, "encode_proxy ok via fake ffmpeg");
  expect(result.backend == "ffmpeg-cli", "backend ffmpeg-cli");
  expect(result.source_unchanged, "source immutable");
  expect(std::filesystem::file_size(source) == source_sha_before, "source size unchanged");
  expect(std::filesystem::exists(proxy), "proxy artifact written");
  expect(result.mapping.scale_filter == "scale=-2:540", "mapping scale");
  expect(result.mapping.timebase_policy == "preserve_source", "timebase policy");
  expect(result.status.state == kedov::io::ProxyJobState::completed, "status completed");

  // Missing source fails cleanly.
  enc.source_path = tmp / "missing.mov";
  enc.output_path = tmp / "proxies" / "missing.mp4";
  const auto miss = kedov::io::encode_proxy(enc);
  expect(!miss.ok, "missing source fails");
  expect(miss.status.state == kedov::io::ProxyJobState::failed, "missing -> failed");

  ::unsetenv("KEDOV_FFMPEG");
  std::filesystem::remove_all(tmp);
  return failures;
}
