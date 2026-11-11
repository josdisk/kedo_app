#include "kedov/io/ffprobe_probe.hpp"

#include <array>
#include <cstdio>
#include <cstdlib>
#include <sstream>
#include <string_view>

#if defined(_WIN32)
#include <windows.h>
#else
#include <sys/wait.h>
#include <unistd.h>
#include <signal.h>
#endif

namespace kedov::io {
namespace {

bool file_executable(const std::filesystem::path& p) {
  std::error_code ec;
  return std::filesystem::exists(p, ec) && std::filesystem::is_regular_file(p, ec);
}

// Minimal JSON number/string extractors — enough for ffprobe -print_format json.
std::optional<std::string> json_string_field(std::string_view json, std::string_view key) {
  const std::string pattern = "\"" + std::string(key) + "\"";
  auto pos = json.find(pattern);
  if (pos == std::string_view::npos) return std::nullopt;
  pos = json.find(':', pos);
  if (pos == std::string_view::npos) return std::nullopt;
  pos = json.find('"', pos);
  if (pos == std::string_view::npos) return std::nullopt;
  const auto start = pos + 1;
  const auto end = json.find('"', start);
  if (end == std::string_view::npos) return std::nullopt;
  return std::string(json.substr(start, end - start));
}

std::optional<std::int64_t> json_int_field(std::string_view json, std::string_view key) {
  const std::string pattern = "\"" + std::string(key) + "\"";
  auto pos = json.find(pattern);
  if (pos == std::string_view::npos) return std::nullopt;
  pos = json.find(':', pos);
  if (pos == std::string_view::npos) return std::nullopt;
  ++pos;
  while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) ++pos;
  if (pos < json.size() && json[pos] == '"') {
    auto s = json_string_field(json, key);
    if (!s) return std::nullopt;
    try {
      return std::stoll(*s);
    } catch (...) {
      return std::nullopt;
    }
  }
  char* end = nullptr;
  const auto v = std::strtoll(json.data() + pos, &end, 10);
  if (end == json.data() + pos) return std::nullopt;
  return v;
}

kedov::core::RationalTime parse_rate(std::string_view rate) {
  const auto slash = rate.find('/');
  if (slash == std::string_view::npos) {
    try {
      const auto v = std::stoll(std::string(rate));
      return kedov::core::RationalTime(v, 1);
    } catch (...) {
      return kedov::core::RationalTime(0, 1);
    }
  }
  try {
    const auto num = std::stoll(std::string(rate.substr(0, slash)));
    const auto den = std::stoll(std::string(rate.substr(slash + 1)));
    if (den == 0) return kedov::core::RationalTime(0, 1);
    return kedov::core::RationalTime(num, den);
  } catch (...) {
    return kedov::core::RationalTime(0, 1);
  }
}

std::string run_process_capture(const std::string& cmd, int /*timeout_ms*/, int& exit_code) {
  // Portable capture via popen. Timeout enforcement is best-effort on POSIX via alarm in caller if needed.
  exit_code = -1;
  std::array<char, 4096> buffer{};
  std::string result;
#if defined(_WIN32)
  FILE* pipe = _popen(cmd.c_str(), "r");
#else
  FILE* pipe = popen(cmd.c_str(), "r");
#endif
  if (!pipe) {
    return {};
  }
  while (fgets(buffer.data(), static_cast<int>(buffer.size()), pipe) != nullptr) {
    result += buffer.data();
  }
#if defined(_WIN32)
  exit_code = _pclose(pipe);
#else
  exit_code = pclose(pipe);
#endif
  return result;
}

}  // namespace

FfprobeMediaProbe::FfprobeMediaProbe(std::string ffprobe_path, int timeout_ms)
    : ffprobe_path_(std::move(ffprobe_path)), timeout_ms_(timeout_ms) {}

std::optional<std::string> FfprobeMediaProbe::find_ffprobe_binary() {
  const char* env = std::getenv("KEDOV_FFPROBE");
  if (env && file_executable(env)) return std::string(env);

  const char* path_env = std::getenv("PATH");
  if (!path_env) return std::nullopt;
  std::stringstream ss(path_env);
  std::string part;
#if defined(_WIN32)
  const char delim = ';';
  const std::string name = "ffprobe.exe";
#else
  const char delim = ':';
  const std::string name = "ffprobe";
#endif
  while (std::getline(ss, part, delim)) {
    const auto candidate = std::filesystem::path(part) / name;
    if (file_executable(candidate)) return candidate.string();
  }
  return std::nullopt;
}

kedov::core::ProbeResult FfprobeMediaProbe::probe(const std::filesystem::path& path) const {
  kedov::core::ProbeResult result;
  result.probe_backend = "ffprobe-cli";
  if (!std::filesystem::exists(path)) {
    result.quarantined = true;
    result.quarantine_reason = "file not found";
    return result;
  }

  // Escape path minimally for shell; prefer quoted path.
  std::ostringstream cmd;
  cmd << '"' << ffprobe_path_ << '"'
      << " -v quiet -print_format json -show_format -show_streams "
      << '"' << path.string() << '"';

  int exit_code = -1;
  const auto json = run_process_capture(cmd.str(), timeout_ms_, exit_code);
  if (json.empty()) {
    result.quarantined = true;
    result.quarantine_reason = "ffprobe produced no output (install FFmpeg or set KEDOV_FFPROBE)";
    return result;
  }

  if (auto fmt = json_string_field(json, "format_name")) {
    result.container = *fmt;
  }
  if (auto dur = json_string_field(json, "duration")) {
    try {
      const double seconds = std::stod(*dur);
      // Store as millisecond ticks / 1000 for approximate rational until stream rate known.
      result.duration = kedov::core::RationalTime(static_cast<std::int64_t>(seconds * 1000.0), 1000);
    } catch (...) {
    }
  }

  // Split streams roughly by codec_type occurrences.
  std::size_t search = 0;
  while (true) {
    auto pos = json.find("\"codec_type\"", search);
    if (pos == std::string::npos) break;
    auto end = json.find("\"codec_type\"", pos + 12);
    auto chunk = json.substr(pos, end == std::string::npos ? json.size() - pos : end - pos);
    kedov::core::StreamProbe stream;
    auto ctype = json_string_field(chunk, "codec_type");
    if (ctype == "video") stream.kind = kedov::core::StreamProbe::Kind::video;
    else if (ctype == "audio") stream.kind = kedov::core::StreamProbe::Kind::audio;
    else stream.kind = kedov::core::StreamProbe::Kind::data;
    if (auto codec = json_string_field(chunk, "codec_name")) stream.codec = *codec;
    if (auto w = json_int_field(chunk, "width")) stream.width = static_cast<std::int32_t>(*w);
    if (auto h = json_int_field(chunk, "height")) stream.height = static_cast<std::int32_t>(*h);
    if (auto sr = json_int_field(chunk, "sample_rate")) stream.sample_rate = static_cast<std::int32_t>(*sr);
    if (auto ch = json_int_field(chunk, "channels")) stream.channels = static_cast<std::int32_t>(*ch);
    if (auto rate = json_string_field(chunk, "avg_frame_rate")) {
      stream.frame_rate = parse_rate(*rate);
    } else if (auto rate = json_string_field(chunk, "r_frame_rate")) {
      stream.frame_rate = parse_rate(*rate);
    }
    if (auto prim = json_string_field(chunk, "color_primaries")) stream.colour_primaries = *prim;
    if (auto trc = json_string_field(chunk, "color_transfer")) stream.colour_transfer = *trc;
    if (auto tc = json_string_field(chunk, "timecode")) stream.timecode = *tc;
    result.streams.push_back(stream);
    search = pos + 12;
  }

  if (result.streams.empty()) {
    result.quarantined = true;
    result.quarantine_reason = "ffprobe JSON contained no streams";
  }
  return result;
}

}  // namespace kedov::io
