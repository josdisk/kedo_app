#include "kedov/audio/drift_map.hpp"
#include "kedov/audio/fingerprint.hpp"
#include "kedov/audio/sync_session.hpp"
#include "kedov/audio/wav_reader.hpp"

#include <chrono>
#include <ctime>
#include <filesystem>
#include <iostream>
#include <sstream>

namespace {

std::string now_iso() {
  const auto t = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
  std::tm tm{};
#if defined(_WIN32)
  gmtime_s(&tm, &t);
#else
  gmtime_r(&t, &tm);
#endif
  char buf[32];
  std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm);
  return buf;
}

}  // namespace

int main(int argc, char** argv) {
  using namespace kedov::audio;
  if (argc < 3) {
    std::cerr
        << "KeDo sync CLI (Milestone 2) — take-aware music sync; never mutates sources.\n"
        << "Usage:\n"
        << "  kedov_sync_cli align <master.wav> <clip.wav> [more clips...] [--out session.json]\n"
        << "  kedov_sync_cli drift <master.wav> <clip.wav> [window] [hop]\n"
        << "  kedov_sync_cli fingerprint <master.wav> <clip.wav>\n"
        << "  kedov_sync_cli show <session.json>\n"
        << "  kedov_sync_cli override <session.json> <asset_id> <sample_offset>\n";
    return 2;
  }

  const std::string cmd = argv[1];
  try {
    if (cmd == "show" && argc >= 3) {
      SyncSession session;
      std::string err;
      if (!load_sync_session(argv[2], session, &err)) {
        std::cerr << "error=" << err << "\n";
        return 1;
      }
      std::cout << sync_session_to_json(session);
      return 0;
    }

    if (cmd == "override" && argc >= 5) {
      SyncSession session;
      std::string err;
      if (!load_sync_session(argv[2], session, &err)) {
        std::cerr << "error=" << err << "\n";
        return 1;
      }
      const std::int64_t offset = std::stoll(argv[4]);
      if (!apply_manual_override(session, argv[3], offset)) {
        std::cerr << "error=asset not found\n";
        return 1;
      }
      if (!save_sync_session(session, argv[2], &err)) {
        std::cerr << "error=" << err << "\n";
        return 1;
      }
      std::cout << "overridden asset=" << argv[3] << " offset=" << offset << "\n";
      return 0;
    }

    if (cmd == "fingerprint" && argc >= 4) {
      const auto master = read_wav_pcm16(argv[2]);
      const auto clip = read_wav_pcm16(argv[3]);
      if (master.sample_rate != clip.sample_rate) {
        std::cerr << "error=sample rate mismatch\n";
        return 1;
      }
      const auto max_lag = std::min<std::int64_t>(
          static_cast<std::int64_t>(master.sample_rate) * 2,
          static_cast<std::int64_t>(std::max<std::size_t>(32, master.mono.size() / 2)));
      const auto ref = build_fingerprint(master.mono, master.sample_rate);
      const auto qry = build_fingerprint(clip.mono, clip.sample_rate);
      const auto matched = match_fingerprints(ref, qry, max_lag);
      const auto refined =
          fingerprint_then_correlate(master.mono, clip.mono, master.sample_rate, max_lag);
      std::cout << "algorithm=" << kFingerprintAlgorithmVersion << "\n"
                << "ref_landmarks=" << ref.landmarks.size() << "\n"
                << "query_landmarks=" << qry.landmarks.size() << "\n"
                << "fp_offset=" << matched.best.sample_offset
                << " conf=" << matched.best.confidence
                << " ambiguous=" << (matched.best.ambiguous ? "true" : "false") << "\n"
                << "refined_offset=" << refined.sample_offset
                << " conf=" << refined.confidence << " note=" << refined.note << "\n";
      for (std::size_t i = 0; i < matched.candidates.size(); ++i) {
        const auto& c = matched.candidates[i];
        std::cout << "cand[" << i << "] offset=" << c.sample_offset << " votes=" << c.vote_count
                  << " score=" << c.score << "\n";
      }
      return 0;
    }

    if (cmd == "drift" && argc >= 4) {
      const auto master = read_wav_pcm16(argv[2]);
      const auto clip = read_wav_pcm16(argv[3]);
      if (master.sample_rate != clip.sample_rate) {
        std::cerr << "error=sample rate mismatch\n";
        return 1;
      }
      const std::size_t window =
          argc >= 5 ? static_cast<std::size_t>(std::stoul(argv[4])) : 4096;
      const std::size_t hop =
          argc >= 6 ? static_cast<std::size_t>(std::stoul(argv[5])) : 2048;
      const auto max_lag = std::min<std::int64_t>(
          static_cast<std::int64_t>(master.sample_rate) * 2,
          static_cast<std::int64_t>(std::max<std::size_t>(32, master.mono.size() / 2)));
      const auto map =
          estimate_drift_map(master.mono, clip.mono, max_lag, window, hop);
      std::cout << "has_drift=" << (map.has_drift ? "true" : "false") << "\n"
                << "mean_abs_residual=" << map.mean_abs_residual << "\n"
                << "note=" << map.note << "\n"
                << "segments=" << map.segments.size() << "\n";
      for (std::size_t i = 0; i < map.segments.size(); ++i) {
        const auto& s = map.segments[i];
        std::cout << "seg[" << i << "] source=" << s.source_start << ".." << s.source_end
                  << " master_start=" << s.master_start << " slope=" << s.slope_num << "/"
                  << s.slope_den << " unc=" << s.uncertainty_samples << "\n";
      }
      if (!map.segments.empty()) {
        const auto mid = (map.segments.front().source_start + map.segments.back().source_end) / 2;
        std::cout << "map_mid_source=" << mid
                  << " -> master=" << map_source_to_master(map, mid) << "\n";
      }
      return 0;
    }

    if (cmd == "align" && argc >= 4) {
      std::string out_path = "sync_session.json";
      std::vector<std::string> clip_paths;
      for (int i = 3; i < argc; ++i) {
        const std::string a = argv[i];
        if (a == "--out" && i + 1 < argc) {
          out_path = argv[++i];
          continue;
        }
        clip_paths.push_back(a);
      }
      if (clip_paths.empty()) {
        std::cerr << "error=no clips\n";
        return 2;
      }

      const auto master = read_wav_pcm16(argv[2]);
      std::vector<std::pair<std::string, std::vector<float>>> clips;
      std::vector<GroupingInput> grouping_in;
      std::int64_t t0 = 1'700'000'000'000;
      for (std::size_t i = 0; i < clip_paths.size(); ++i) {
        const auto wav = read_wav_pcm16(clip_paths[i]);
        if (wav.sample_rate != master.sample_rate) {
          std::cerr << "error=sample rate mismatch (resample not in this CLI yet)\n";
          return 1;
        }
        const auto asset = std::filesystem::path(clip_paths[i]).stem().string();
        clips.push_back({asset, wav.mono});
        // Default: each file is its own take unless names share a prefix cam*_takeN.
        GroupingInput gin;
        gin.asset_id = asset;
        gin.camera_label = asset;
        // Stagger wall-clock by 1 hour per clip so repeated takes stay separate by default.
        gin.recorded_at_ms = t0 + static_cast<std::int64_t>(i) * 3'600'000;
        grouping_in.push_back(gin);
      }

      const auto grouping = group_takes_and_angles(grouping_in, 5000);
      const auto max_lag = std::min<std::int64_t>(
          static_cast<std::int64_t>(master.sample_rate) * 2,
          static_cast<std::int64_t>(std::max<std::size_t>(32, master.mono.size() / 2)));
      const auto alignments = align_clips_to_master(
          master.mono, clips, grouping, master.sample_rate, 24, 1, max_lag);

      SyncSession session;
      session.session_id = "sync_" + now_iso();
      session.project_id = "local";
      session.master_asset_id = std::filesystem::path(argv[2]).stem().string();
      session.sample_rate = master.sample_rate;
      session.takes = grouping.takes;
      session.angles = grouping.angles;
      session.alignments = alignments;
      session.created_at_iso = now_iso();

      std::string err;
      if (!save_sync_session(session, out_path, &err)) {
        std::cerr << "error=" << err << "\n";
        return 1;
      }

      std::cout << "algorithm=" << kSyncAlgorithmVersion << "\n"
                << "out=" << out_path << "\n"
                << "takes=" << session.takes.size() << " angles=" << session.angles.size() << "\n";
      for (const auto& al : session.alignments) {
        std::cout << al.asset_id << "\ttake=" << al.take_id << "\toffset=" << al.sample_offset
                  << "\tconf=" << al.confidence << "\tframe_err≈" << al.frame_error_approx
                  << "\tambiguous=" << (al.ambiguous ? "true" : "false") << "\t" << al.note << "\n";
      }
      return 0;
    }
  } catch (const std::exception& ex) {
    std::cerr << "error=" << ex.what() << "\n";
    return 1;
  }

  std::cerr << "unknown command\n";
  return 2;
}
