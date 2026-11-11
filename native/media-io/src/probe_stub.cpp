#include "kedov/io/media_probe.hpp"

#include "kedov/io/ffprobe_probe.hpp"

#include <memory>

namespace kedov::io {

kedov::core::ProbeResult StubMediaProbe::probe(const std::filesystem::path& path) const {
  kedov::core::ProbeResult result;
  result.probe_backend = "stub";
  result.container = path.extension().string();
  if (!std::filesystem::exists(path)) {
    result.quarantined = true;
    result.quarantine_reason = "file not found";
    return result;
  }
  result.quarantined = true;
  result.quarantine_reason =
      "No ffprobe/ffmpeg found. Install FFmpeg (LGPL build preferred) and ensure `ffprobe` is on "
      "PATH, or set KEDOV_FFPROBE. Linked libav remains behind -DKEDOV_ENABLE_FFMPEG=ON after "
      "licenses/THIRD_PARTY_APPROVAL.md. Unit tests remain runnable without FFmpeg.";
  return result;
}

std::unique_ptr<IMediaProbe> create_default_probe() {
#if defined(KEDOV_HAS_FFMPEG) && KEDOV_HAS_FFMPEG
  extern std::unique_ptr<IMediaProbe> create_ffmpeg_probe();
  return create_ffmpeg_probe();
#else
  if (auto path = FfprobeMediaProbe::find_ffprobe_binary()) {
    return std::make_unique<FfprobeMediaProbe>(std::move(*path));
  }
  return std::make_unique<StubMediaProbe>();
#endif
}

}  // namespace kedov::io
