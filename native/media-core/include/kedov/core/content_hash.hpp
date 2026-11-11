#pragma once

#include <cstdint>
#include <filesystem>
#include <string>

namespace kedov::core {

/// Streaming SHA-256 of file contents (ING-003). Does not modify the source.
[[nodiscard]] std::string sha256_file(const std::filesystem::path& path);

/// Fast fingerprint: size + first/last 64 KiB SHA-256 hex (prefilter before full hash).
struct FastFingerprint {
  std::uint64_t size_bytes = 0;
  std::string partial_sha256;
};

[[nodiscard]] FastFingerprint fast_fingerprint(const std::filesystem::path& path);

}  // namespace kedov::core
