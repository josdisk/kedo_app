#pragma once

#include "kedov/core/probe_result.hpp"

#include <filesystem>
#include <memory>
#include <string>

namespace kedov::io {

class IMediaProbe {
 public:
  virtual ~IMediaProbe() = default;
  [[nodiscard]] virtual kedov::core::ProbeResult probe(const std::filesystem::path& path) const = 0;
  [[nodiscard]] virtual std::string backend_name() const = 0;
};

/// Always available; returns structured guidance when FFmpeg is not linked (ING-002).
class StubMediaProbe final : public IMediaProbe {
 public:
  [[nodiscard]] kedov::core::ProbeResult probe(const std::filesystem::path& path) const override;
  [[nodiscard]] std::string backend_name() const override { return "stub"; }
};

std::unique_ptr<IMediaProbe> create_default_probe();

}  // namespace kedov::io
