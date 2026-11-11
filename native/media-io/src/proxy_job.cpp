#include "kedov/io/proxy_job.hpp"
#include "kedov/io/frame_extract.hpp"

#include <cstdlib>
#include <sstream>

namespace kedov::io {
namespace {

#if defined(_WIN32)
std::string quote_arg(const std::string& s) {
  return "\"" + s + "\"";
}
#else
std::string quote_arg(const std::string& s) {
  std::string out = "'";
  for (char c : s) {
    if (c == '\'')
      out += "'\\''";
    else
      out += c;
  }
  out += "'";
  return out;
}
#endif

int run_argv(const std::vector<std::string>& argv) {
  if (argv.empty()) return 127;
  std::ostringstream cmd;
  for (std::size_t i = 0; i < argv.size(); ++i) {
    if (i) cmd << ' ';
    cmd << quote_arg(argv[i]);
  }
  return std::system(cmd.str().c_str());
}

}  // namespace

const char* to_string(ProxyJobState state) {
  switch (state) {
    case ProxyJobState::queued:
      return "queued";
    case ProxyJobState::running:
      return "running";
    case ProxyJobState::completed:
      return "completed";
    case ProxyJobState::failed:
      return "failed";
    case ProxyJobState::cancelled:
      return "cancelled";
  }
  return "queued";
}

ProxyJobStatus advance_proxy_job(ProxyJobStatus current, bool succeed) {
  switch (current.state) {
    case ProxyJobState::queued:
      current.state = ProxyJobState::running;
      current.progress = 0.05;
      current.message = "proxy encode started";
      break;
    case ProxyJobState::running:
      if (succeed) {
        current.state = ProxyJobState::completed;
        current.progress = 1.0;
        current.message = "proxy ready";
      } else {
        current.state = ProxyJobState::failed;
        current.message = "proxy encode failed";
      }
      break;
    default:
      break;
  }
  return current;
}

std::string proxy_scale_filter(std::int32_t target_height) {
  if (target_height < 120) target_height = 120;
  if (target_height > 4320) target_height = 4320;
  return "scale=-2:" + std::to_string(target_height);
}

std::vector<std::string> build_proxy_ffmpeg_argv(const ProxyJobSpec& spec,
                                                 const std::string& ffmpeg_bin) {
  const auto vf = proxy_scale_filter(spec.target_height);
  return {
      ffmpeg_bin,
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      spec.source_path.string(),
      "-vf",
      vf,
      "-c:v",
      spec.video_codec.empty() ? "mpeg4" : spec.video_codec,
      "-q:v",
      "5",
      "-c:a",
      spec.audio_codec.empty() ? "aac" : spec.audio_codec,
      "-movflags",
      "+faststart",
      spec.output_path.string(),
  };
}

ProxyEncodeResult encode_proxy(const ProxyJobSpec& spec) {
  ProxyEncodeResult out;
  out.status.job_id = spec.job_id;
  out.status.state = ProxyJobState::running;
  out.status.progress = 0.1;
  out.mapping.source_uri = "file://" + spec.source_path.string();
  out.mapping.proxy_uri = "file://" + spec.output_path.string();
  out.mapping.target_height = spec.target_height;
  out.mapping.scale_filter = proxy_scale_filter(spec.target_height);
  out.mapping.timebase_policy = "preserve_source";
  out.source_unchanged = true;

  auto ffmpeg = find_ffmpeg_binary();
  if (!ffmpeg) {
    out.backend = "unavailable";
    out.status.state = ProxyJobState::failed;
    out.message =
        "ffmpeg not found on PATH (set KEDOV_FFMPEG). Source left untouched.";
    out.status.message = out.message;
    return out;
  }
  out.backend = "ffmpeg-cli";

  if (!std::filesystem::exists(spec.source_path)) {
    out.status.state = ProxyJobState::failed;
    out.message = "source not found";
    out.status.message = out.message;
    return out;
  }

  const auto source_size_before = std::filesystem::file_size(spec.source_path);

  std::error_code ec;
  std::filesystem::create_directories(spec.output_path.parent_path(), ec);

  const auto argv = build_proxy_ffmpeg_argv(spec, *ffmpeg);
  const int code = run_argv(argv);
  if (code != 0 || !std::filesystem::exists(spec.output_path)) {
    out.status.state = ProxyJobState::failed;
    out.message = "ffmpeg proxy encode failed (exit " + std::to_string(code) + ")";
    out.status.message = out.message;
    return out;
  }

  const auto source_size_after = std::filesystem::file_size(spec.source_path);
  out.source_unchanged = (source_size_before == source_size_after);
  if (!out.source_unchanged) {
    out.status.state = ProxyJobState::failed;
    out.message = "source file changed during proxy encode — abort";
    out.status.message = out.message;
    out.ok = false;
    return out;
  }

  out.ok = true;
  out.status.state = ProxyJobState::completed;
  out.status.progress = 1.0;
  out.message = "ok";
  out.status.message = "proxy ready";
  return out;
}

}  // namespace kedov::io
