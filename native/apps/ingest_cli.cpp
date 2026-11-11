#include "kedov/core/content_hash.hpp"
#include "kedov/io/folder_scan.hpp"
#include "kedov/io/frame_extract.hpp"
#include "kedov/io/media_probe.hpp"
#include "kedov/io/proxy_job.hpp"

#include <cstdlib>
#include <iostream>
#include <sstream>

namespace {

void print_probe(const kedov::core::ProbeResult& result) {
  std::cout << "probe_backend=" << result.probe_backend << "\n"
            << "container=" << result.container << "\n"
            << "duration=" << result.duration.to_string() << "\n"
            << "quarantined=" << (result.quarantined ? "true" : "false") << "\n";
  if (!result.quarantine_reason.empty()) {
    std::cout << "quarantine_reason=" << result.quarantine_reason << "\n";
  }
  for (std::size_t i = 0; i < result.streams.size(); ++i) {
    const auto& s = result.streams[i];
    std::cout << "stream[" << i << "].kind=";
    switch (s.kind) {
      case kedov::core::StreamProbe::Kind::video:
        std::cout << "video";
        break;
      case kedov::core::StreamProbe::Kind::audio:
        std::cout << "audio";
        break;
      case kedov::core::StreamProbe::Kind::data:
        std::cout << "data";
        break;
      default:
        std::cout << "unknown";
        break;
    }
    std::cout << " codec=" << s.codec;
    if (s.kind == kedov::core::StreamProbe::Kind::video) {
      std::cout << " " << s.width << "x" << s.height
                << " fps=" << s.frame_rate.to_string();
    }
    if (s.kind == kedov::core::StreamProbe::Kind::audio) {
      std::cout << " sr=" << s.sample_rate << " ch=" << s.channels;
    }
    std::cout << "\n";
  }
}

}  // namespace

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr
        << "KeDo ingest CLI (Milestone 1) — never modifies source files.\n"
        << "Usage:\n"
        << "  kedov_ingest_cli probe <file>\n"
        << "  kedov_ingest_cli hash <file>\n"
        << "  kedov_ingest_cli scan <folder>\n"
        << "  kedov_ingest_cli ingest <file> [out_dir]\n"
        << "  kedov_ingest_cli proxy <source> <output.mp4> [height]\n"
        << "  kedov_ingest_cli scrub <source> <frame> <output.ppm> [fps_num] [fps_den]\n"
        << "  kedov_ingest_cli proxy-skeleton <job_id>\n";
    return 2;
  }

  const std::string cmd = argv[1];
  try {
    if (cmd == "probe" && argc >= 3) {
      auto probe = kedov::io::create_default_probe();
      print_probe(probe->probe(argv[2]));
      return 0;
    }
    if (cmd == "hash" && argc >= 3) {
      const auto fp = kedov::core::fast_fingerprint(argv[2]);
      const auto full = kedov::core::sha256_file(argv[2]);
      std::cout << "size_bytes=" << fp.size_bytes << "\n"
                << "fast_sha256=" << fp.partial_sha256 << "\n"
                << "sha256=" << full << "\n";
      return 0;
    }
    if (cmd == "scan" && argc >= 3) {
      kedov::io::FolderScanOptions opts;
      opts.allowed_roots = {argv[2]};
      std::string err;
      const auto files = kedov::io::scan_folder(argv[2], opts, &err);
      if (!err.empty()) {
        std::cerr << "error=" << err << "\n";
        return 1;
      }
      std::cout << "count=" << files.size() << "\n";
      for (const auto& f : files) {
        std::cout << f.size_bytes << "\t" << f.path.string() << "\n";
      }
      return 0;
    }
    if (cmd == "ingest" && argc >= 3) {
      const std::filesystem::path src = argv[2];
      const std::filesystem::path out_dir =
          argc >= 4 ? std::filesystem::path(argv[3]) : std::filesystem::path("kedov_ingest_out");
      std::filesystem::create_directories(out_dir);

      const auto fp = kedov::core::fast_fingerprint(src);
      const auto sha = kedov::core::sha256_file(src);
      auto probe = kedov::io::create_default_probe();
      const auto probed = probe->probe(src);
      const auto frame_path = out_dir / (src.stem().string() + "_frame0.ppm");
      const auto frame = kedov::io::extract_first_frame_ppm(src, frame_path);

      std::cout << "asset_sha256=" << sha << "\n"
                << "fast_sha256=" << fp.partial_sha256 << "\n"
                << "size_bytes=" << fp.size_bytes << "\n"
                << "source_immutable=true\n";
      print_probe(probed);
      std::cout << "frame_backend=" << frame.backend << "\n"
                << "frame_ok=" << (frame.ok ? "true" : "false") << "\n"
                << "frame_message=" << frame.message << "\n";
      if (frame.ok) std::cout << "frame_path=" << frame.output_path.string() << "\n";

      const auto proxy_out = out_dir / (src.stem().string() + "_proxy720.mp4");
      kedov::io::ProxyJobSpec pspec;
      pspec.job_id = "proxy_" + sha.substr(0, 8);
      pspec.source_path = src;
      pspec.output_path = proxy_out;
      pspec.target_height = 720;
      const auto encoded = kedov::io::encode_proxy(pspec);
      std::cout << "proxy_job=" << pspec.job_id
                << " state=" << kedov::io::to_string(encoded.status.state)
                << " backend=" << encoded.backend
                << " ok=" << (encoded.ok ? "true" : "false")
                << " source_unchanged=" << (encoded.source_unchanged ? "true" : "false")
                << " msg=" << encoded.message << "\n";
      if (encoded.ok) {
        std::cout << "proxy_path=" << proxy_out.string() << "\n"
                  << "proxy_scale=" << encoded.mapping.scale_filter << "\n";
      }
      return 0;
    }
    if (cmd == "proxy" && argc >= 4) {
      kedov::io::ProxyJobSpec pspec;
      pspec.job_id = "proxy_cli";
      pspec.source_path = argv[2];
      pspec.output_path = argv[3];
      if (argc >= 5) pspec.target_height = std::atoi(argv[4]);
      const auto encoded = kedov::io::encode_proxy(pspec);
      std::cout << "ok=" << (encoded.ok ? "true" : "false") << "\n"
                << "backend=" << encoded.backend << "\n"
                << "state=" << kedov::io::to_string(encoded.status.state) << "\n"
                << "source_unchanged=" << (encoded.source_unchanged ? "true" : "false") << "\n"
                << "message=" << encoded.message << "\n";
      if (encoded.ok) {
        std::cout << "proxy_path=" << pspec.output_path.string() << "\n"
                  << "scale_filter=" << encoded.mapping.scale_filter << "\n"
                  << "timebase_policy=" << encoded.mapping.timebase_policy << "\n";
      }
      return encoded.ok ? 0 : 1;
    }
    if (cmd == "scrub" && argc >= 5) {
      kedov::io::ScrubScheduler sched;
      kedov::io::ScrubRequest req;
      req.generation = sched.begin_scrub();
      req.source_path = argv[2];
      req.frame_index = std::atoll(argv[3]);
      req.output_ppm = argv[4];
      if (argc >= 6) req.fps_num = std::atoll(argv[5]);
      if (argc >= 7) req.fps_den = std::atoll(argv[6]);
      const auto result = sched.run_if_current(req);
      std::cout << "ok=" << (result.ok ? "true" : "false") << "\n"
                << "backend=" << result.backend << "\n"
                << "frame_index=" << result.frame_index << "\n"
                << "generation=" << result.request_generation << "\n"
                << "message=" << result.message << "\n";
      if (result.ok) std::cout << "output=" << result.output_path.string() << "\n";
      return result.ok ? 0 : 1;
    }
    if (cmd == "proxy-skeleton" && argc >= 3) {
      kedov::io::ProxyJobStatus st{.job_id = argv[2], .state = kedov::io::ProxyJobState::queued};
      st = kedov::io::advance_proxy_job(st, true);
      std::cout << "state=" << kedov::io::to_string(st.state) << " progress=" << st.progress << "\n";
      st = kedov::io::advance_proxy_job(st, true);
      std::cout << "state=" << kedov::io::to_string(st.state) << " progress=" << st.progress << "\n";
      return 0;
    }
  } catch (const std::exception& ex) {
    std::cerr << "error=" << ex.what() << "\n";
    return 1;
  }

  std::cerr << "unknown command\n";
  return 2;
}
