#include "kedov/io/media_probe.hpp"

#include <memory>

// Placeholder translation unit compiled only with KEDOV_ENABLE_FFMPEG=ON.
// Full FFmpeg probing will call avformat_open_input after license gate approval.

namespace kedov::io {

class FfmpegMediaProbe final : public IMediaProbe {
 public:
  [[nodiscard]] kedov::core::ProbeResult probe(const std::filesystem::path& path) const override {
    // Until FFmpeg symbols are wired, fall back to stub semantics with backend label.
    StubMediaProbe stub;
    auto result = stub.probe(path);
    result.probe_backend = "ffmpeg-pending";
    result.quarantine_reason =
        "FFmpeg backend enabled but not yet fully wired; treating as quarantine.";
    return result;
  }

  [[nodiscard]] std::string backend_name() const override { return "ffmpeg"; }
};

std::unique_ptr<IMediaProbe> create_ffmpeg_probe() {
  return std::make_unique<FfmpegMediaProbe>();
}

}  // namespace kedov::io
