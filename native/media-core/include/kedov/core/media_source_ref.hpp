#pragma once

#include <cstdint>
#include <optional>
#include <string>

namespace kedov::core {

/// Immutable reference to a source asset. Original files are never edited in place (ING).
struct MediaSourceRef {
  std::string asset_id;
  std::string content_sha256;
  std::string locator_uri;
  std::int64_t size_bytes = 0;
  bool offline = false;
};

struct ColourMetadata {
  std::string primaries;
  std::string transfer;
  std::string matrix;
  std::optional<std::string> input_colorspace;
};

}  // namespace kedov::core
