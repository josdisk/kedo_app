#include "kedov/io/folder_scan.hpp"

#include <algorithm>
#include <cctype>

namespace kedov::io {
namespace {

std::filesystem::path weakly_canonical_or_abs(const std::filesystem::path& p) {
  std::error_code ec;
  auto c = std::filesystem::weakly_canonical(p, ec);
  if (ec) {
    c = std::filesystem::absolute(p, ec);
  }
  return c;
}

bool has_allowed_ext(const std::filesystem::path& path, const std::vector<std::string>& exts) {
  auto ext = path.extension().string();
  std::transform(ext.begin(), ext.end(), ext.begin(),
                 [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  return std::find(exts.begin(), exts.end(), ext) != exts.end();
}

const std::vector<std::string>& default_exts() {
  static const std::vector<std::string> k = {
      ".mov", ".mp4", ".m4v", ".mkv", ".avi", ".mxf", ".webm", ".mpg", ".mpeg",
      ".wav", ".aiff", ".aif", ".mp3", ".flac", ".aac", ".m4a", ".braw", ".r3d"};
  return k;
}

}  // namespace

bool path_is_within_roots(const std::filesystem::path& path,
                          const std::vector<std::filesystem::path>& roots) {
  if (roots.empty()) return false;
  const auto abs = weakly_canonical_or_abs(path);
  for (const auto& root : roots) {
    const auto r = weakly_canonical_or_abs(root);
    auto [a, b] = std::mismatch(r.begin(), r.end(), abs.begin(), abs.end());
    if (a == r.end()) {
      return true;
    }
  }
  return false;
}

std::vector<ScannedFile> scan_folder(const std::filesystem::path& root,
                                     const FolderScanOptions& options, std::string* error_out) {
  std::vector<ScannedFile> out;
  if (options.allowed_roots.empty()) {
    if (error_out) *error_out = "refusing scan: allowed_roots is empty (ING-001)";
    return out;
  }
  if (!path_is_within_roots(root, options.allowed_roots)) {
    if (error_out) *error_out = "root is outside allowed_roots";
    return out;
  }

  const auto& exts = options.extensions.empty() ? default_exts() : options.extensions;
  std::error_code ec;
  const auto opts = options.follow_symlinks
                        ? std::filesystem::directory_options::follow_directory_symlink
                        : std::filesystem::directory_options::none;

  for (std::filesystem::recursive_directory_iterator it(
           root, opts, ec),
       end;
       it != end; it.increment(ec)) {
    if (ec) {
      ec.clear();
      continue;
    }
    if (!path_is_within_roots(it->path(), options.allowed_roots)) {
      it.disable_recursion_pending();
      continue;
    }
    if (!it->is_regular_file(ec)) continue;
    if (!has_allowed_ext(it->path(), exts)) continue;
    ScannedFile f;
    f.path = it->path();
    f.size_bytes = static_cast<std::uint64_t>(it->file_size(ec));
    out.push_back(std::move(f));
    if (out.size() >= options.max_files) break;
  }
  return out;
}

}  // namespace kedov::io
