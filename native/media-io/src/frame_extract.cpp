#include "kedov/io/frame_extract.hpp"

#include <cstdlib>
#include <sstream>

namespace kedov::io {
namespace {

bool file_executable(const std::filesystem::path& p) {
  std::error_code ec;
  return std::filesystem::exists(p, ec) && std::filesystem::is_regular_file(p, ec);
}

#if defined(_WIN32)
std::string quote_arg(const std::string& s) { return "\"" + s + "\""; }
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

double seek_seconds(std::int64_t frame_index, std::int64_t fps_num, std::int64_t fps_den) {
  if (fps_num <= 0 || fps_den <= 0) return 0.0;
  if (frame_index < 0) frame_index = 0;
  return (static_cast<double>(frame_index) * static_cast<double>(fps_den)) /
         static_cast<double>(fps_num);
}

}  // namespace

std::optional<std::string> find_ffmpeg_binary() {
  const char* env = std::getenv("KEDOV_FFMPEG");
  if (env && file_executable(env)) return std::string(env);
  const char* path_env = std::getenv("PATH");
  if (!path_env) return std::nullopt;
  std::stringstream ss(path_env);
  std::string part;
  while (std::getline(ss, part, ':')) {
    const auto candidate = std::filesystem::path(part) / "ffmpeg";
    if (file_executable(candidate)) return candidate.string();
  }
  return std::nullopt;
}

std::vector<std::string> build_scrub_ffmpeg_argv(const ScrubRequest& request,
                                                 const std::string& ffmpeg_bin) {
  const double ss = seek_seconds(request.frame_index, request.fps_num, request.fps_den);
  std::ostringstream ss_str;
  ss_str.setf(std::ios::fixed);
  ss_str.precision(6);
  ss_str << ss;
  return {
      ffmpeg_bin,
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      request.source_path.string(),
      "-ss",
      ss_str.str(),
      "-frames:v",
      "1",
      request.output_ppm.string(),
  };
}

FrameExtractResult extract_first_frame_ppm(const std::filesystem::path& source,
                                           const std::filesystem::path& output_ppm) {
  ScrubRequest req;
  req.source_path = source;
  req.output_ppm = output_ppm;
  req.frame_index = 0;
  req.fps_num = 24;
  req.fps_den = 1;
  return extract_frame_at(req);
}

FrameExtractResult extract_frame_at(const ScrubRequest& request) {
  FrameExtractResult out;
  out.frame_index = request.frame_index;
  out.request_generation = request.generation;

  auto ffmpeg = find_ffmpeg_binary();
  if (!ffmpeg) {
    out.backend = "unavailable";
    out.message =
        "ffmpeg not found on PATH (set KEDOV_FFMPEG). Probe/hash still work; frame scrub deferred.";
    return out;
  }
  out.backend = "ffmpeg-cli";
  if (!std::filesystem::exists(request.source_path)) {
    out.message = "source not found";
    return out;
  }
  if (request.source_path == request.output_ppm) {
    out.message = "output must differ from source";
    return out;
  }

  std::error_code ec;
  std::filesystem::create_directories(request.output_ppm.parent_path(), ec);

  const auto argv = build_scrub_ffmpeg_argv(request, *ffmpeg);
  const int code = run_argv(argv);
  if (code != 0 || !std::filesystem::exists(request.output_ppm)) {
    out.message = "ffmpeg frame extract failed (exit " + std::to_string(code) + ")";
    return out;
  }
  out.ok = true;
  out.output_path = request.output_ppm;
  out.message = "ok";
  return out;
}

std::uint64_t ScrubScheduler::begin_scrub() {
  ++generation_;
  return generation_;
}

bool ScrubScheduler::is_current(std::uint64_t generation) const noexcept {
  return generation == generation_ && generation != 0;
}

FrameExtractResult ScrubScheduler::run_if_current(const ScrubRequest& request) {
  FrameExtractResult out;
  out.frame_index = request.frame_index;
  out.request_generation = request.generation;
  out.backend = "scheduler";
  if (!is_current(request.generation)) {
    out.message = "obsolete scrub cancelled";
    return out;
  }
  out = extract_frame_at(request);
  if (!is_current(request.generation)) {
    out.ok = false;
    out.message = "obsolete scrub cancelled after extract";
    return out;
  }
  return out;
}

}  // namespace kedov::io
