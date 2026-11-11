#include "kedov/core/content_hash.hpp"
#include "kedov/io/folder_scan.hpp"
#include "kedov/io/media_probe.hpp"
#include "kedov/io/proxy_job.hpp"

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

}  // namespace

int test_ingest_main() {
  const auto tmp = std::filesystem::temp_directory_path() / "kedov_ingest_test";
  std::filesystem::create_directories(tmp);
  const auto allowed = tmp / "allowed";
  const auto outside = tmp / "outside";
  std::filesystem::create_directories(allowed);
  std::filesystem::create_directories(outside);

  {
    std::ofstream(allowed / "clip.wav") << "RIFF....WAVEfmt ";
    std::ofstream(allowed / "notes.txt") << "not media";
    std::ofstream(outside / "secret.mov") << "should not scan";
  }

  kedov::io::FolderScanOptions opts;
  opts.allowed_roots = {allowed};
  std::string err;
  // Attempt to scan outside root must fail.
  auto bad = kedov::io::scan_folder(outside, opts, &err);
  expect(bad.empty(), "outside root yields no files");
  expect(!err.empty(), "outside root reports error");

  err.clear();
  auto files = kedov::io::scan_folder(allowed, opts, &err);
  expect(err.empty(), "allowed scan ok");
  expect(files.size() == 1, "only wav media matched");
  expect(files[0].path.filename() == "clip.wav", "wav found");

  // Nested escape attempt: symlink or path outside — disable recursion when leaving roots.
  expect(!kedov::io::path_is_within_roots(outside / "secret.mov", opts.allowed_roots),
         "outside path rejected");

  const auto a = allowed / "clip.wav";
  const auto sha1 = kedov::core::sha256_file(a);
  const auto sha2 = kedov::core::sha256_file(a);
  expect(sha1.size() == 64, "sha256 hex length");
  expect(sha1 == sha2, "hash stable");

  std::ofstream(allowed / "clip2.wav") << "RIFF....WAVEfmt different";
  const auto sha_other = kedov::core::sha256_file(allowed / "clip2.wav");
  expect(sha_other != sha1, "different content different hash");

  auto probe = kedov::io::create_default_probe();
  const auto result = probe->probe(a);
  expect(!result.probe_backend.empty(), "probe backend set");
  // Without ffprobe, stub quarantines with guidance — still non-crashing (ING-002/004).
  expect(result.quarantined || !result.streams.empty(), "probe returns structured result");

  kedov::io::ProxyJobStatus st{.job_id = "j1", .state = kedov::io::ProxyJobState::queued};
  st = kedov::io::advance_proxy_job(st, true);
  expect(st.state == kedov::io::ProxyJobState::running, "proxy queued->running");
  st = kedov::io::advance_proxy_job(st, true);
  expect(st.state == kedov::io::ProxyJobState::completed, "proxy running->completed");

  std::filesystem::remove_all(tmp);
  return failures;
}
