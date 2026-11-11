#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace kedov::io {

struct ScannedFile {
  std::filesystem::path path;
  std::uint64_t size_bytes = 0;
};

struct FolderScanOptions {
  /// Only traverse within these absolute roots (ING-001). Empty = refuse scan.
  std::vector<std::filesystem::path> allowed_roots;
  bool follow_symlinks = false;
  std::size_t max_files = 100000;
  std::vector<std::string> extensions;  // lowercase incl. dot; empty = common media set
};

/// Permissioned recursive scan. Paths outside allowed_roots are never traversed.
[[nodiscard]] std::vector<ScannedFile> scan_folder(const std::filesystem::path& root,
                                                   const FolderScanOptions& options,
                                                   std::string* error_out = nullptr);

[[nodiscard]] bool path_is_within_roots(const std::filesystem::path& path,
                                        const std::vector<std::filesystem::path>& roots);

}  // namespace kedov::io
