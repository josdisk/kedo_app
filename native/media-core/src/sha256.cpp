#include "kedov/core/content_hash.hpp"

#include <array>
#include <cstring>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <vector>

namespace kedov::core {
namespace {

// Compact public-domain SHA-256 (Brad Conte style) for portable hashing without OpenSSL.
class Sha256 {
 public:
  Sha256() { reset(); }

  void update(const std::uint8_t* data, std::size_t len) {
    for (std::size_t i = 0; i < len; ++i) {
      data_[datalen_++] = data[i];
      if (datalen_ == 64) {
        transform();
        bitlen_ += 512;
        datalen_ = 0;
      }
    }
  }

  std::array<std::uint8_t, 32> digest() {
    auto i = datalen_;
    if (datalen_ < 56) {
      data_[i++] = 0x80;
      while (i < 56) data_[i++] = 0x00;
    } else {
      data_[i++] = 0x80;
      while (i < 64) data_[i++] = 0x00;
      transform();
      std::memset(data_.data(), 0, 56);
    }
    bitlen_ += static_cast<std::uint64_t>(datalen_) * 8;
    data_[63] = static_cast<std::uint8_t>(bitlen_);
    data_[62] = static_cast<std::uint8_t>(bitlen_ >> 8);
    data_[61] = static_cast<std::uint8_t>(bitlen_ >> 16);
    data_[60] = static_cast<std::uint8_t>(bitlen_ >> 24);
    data_[59] = static_cast<std::uint8_t>(bitlen_ >> 32);
    data_[58] = static_cast<std::uint8_t>(bitlen_ >> 40);
    data_[57] = static_cast<std::uint8_t>(bitlen_ >> 48);
    data_[56] = static_cast<std::uint8_t>(bitlen_ >> 56);
    transform();

    std::array<std::uint8_t, 32> hash{};
    for (int j = 0; j < 4; ++j) {
      hash[j] = (state_[0] >> (24 - j * 8)) & 0xff;
      hash[j + 4] = (state_[1] >> (24 - j * 8)) & 0xff;
      hash[j + 8] = (state_[2] >> (24 - j * 8)) & 0xff;
      hash[j + 12] = (state_[3] >> (24 - j * 8)) & 0xff;
      hash[j + 16] = (state_[4] >> (24 - j * 8)) & 0xff;
      hash[j + 20] = (state_[5] >> (24 - j * 8)) & 0xff;
      hash[j + 24] = (state_[6] >> (24 - j * 8)) & 0xff;
      hash[j + 28] = (state_[7] >> (24 - j * 8)) & 0xff;
    }
    return hash;
  }

 private:
  void reset() {
    datalen_ = 0;
    bitlen_ = 0;
    state_ = {0x6a09e667u, 0xbb67ae85u, 0x3c6ef372u, 0xa54ff53au,
              0x510e527fu, 0x9b05688cu, 0x1f83d9abu, 0x5be0cd19u};
  }

  static std::uint32_t rotr(std::uint32_t x, std::uint32_t n) {
    return (x >> n) | (x << (32 - n));
  }

  void transform() {
    static constexpr std::uint32_t k[64] = {
        0x428a2f98u, 0x71374491u, 0xb5c0fbcfu, 0xe9b5dba5u, 0x3956c25bu, 0x59f111f1u,
        0x923f82a4u, 0xab1c5ed5u, 0xd807aa98u, 0x12835b01u, 0x243185beu, 0x550c7dc3u,
        0x72be5d74u, 0x80deb1feu, 0x9bdc06a7u, 0xc19bf174u, 0xe49b69c1u, 0xefbe4786u,
        0x0fc19dc6u, 0x240ca1ccu, 0x2de92c6fu, 0x4a7484aau, 0x5cb0a9dcu, 0x76f988dau,
        0x983e5152u, 0xa831c66du, 0xb00327c8u, 0xbf597fc7u, 0xc6e00bf3u, 0xd5a79147u,
        0x06ca6351u, 0x14292967u, 0x27b70a85u, 0x2e1b2138u, 0x4d2c6dfcu, 0x53380d13u,
        0x650a7354u, 0x766a0abbu, 0x81c2c92eu, 0x92722c85u, 0xa2bfe8a1u, 0xa81a664bu,
        0xc24b8b70u, 0xc76c51a3u, 0xd192e819u, 0xd6990624u, 0xf40e3585u, 0x106aa070u,
        0x19a4c116u, 0x1e376c08u, 0x2748774cu, 0x34b0bcb5u, 0x391c0cb3u, 0x4ed8aa4au,
        0x5b9cca4fu, 0x682e6ff3u, 0x748f82eeu, 0x78a5636fu, 0x84c87814u, 0x8cc70208u,
        0x90befffau, 0xa4506cebu, 0xbef9a3f7u, 0xc67178f2u};

    std::uint32_t m[64];
    for (int i = 0, j = 0; i < 16; ++i, j += 4) {
      m[i] = (static_cast<std::uint32_t>(data_[j]) << 24) |
             (static_cast<std::uint32_t>(data_[j + 1]) << 16) |
             (static_cast<std::uint32_t>(data_[j + 2]) << 8) |
             (static_cast<std::uint32_t>(data_[j + 3]));
    }
    for (int i = 16; i < 64; ++i) {
      const std::uint32_t s0 = rotr(m[i - 15], 7) ^ rotr(m[i - 15], 18) ^ (m[i - 15] >> 3);
      const std::uint32_t s1 = rotr(m[i - 2], 17) ^ rotr(m[i - 2], 19) ^ (m[i - 2] >> 10);
      m[i] = m[i - 16] + s0 + m[i - 7] + s1;
    }

    auto a = state_[0], b = state_[1], c = state_[2], d = state_[3];
    auto e = state_[4], f = state_[5], g = state_[6], h = state_[7];
    for (int i = 0; i < 64; ++i) {
      const std::uint32_t S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const std::uint32_t ch = (e & f) ^ ((~e) & g);
      const std::uint32_t temp1 = h + S1 + ch + k[i] + m[i];
      const std::uint32_t S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const std::uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
      const std::uint32_t temp2 = S0 + maj;
      h = g;
      g = f;
      f = e;
      e = d + temp1;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2;
    }
    state_[0] += a;
    state_[1] += b;
    state_[2] += c;
    state_[3] += d;
    state_[4] += e;
    state_[5] += f;
    state_[6] += g;
    state_[7] += h;
  }

  std::array<std::uint8_t, 64> data_{};
  std::uint32_t datalen_ = 0;
  std::uint64_t bitlen_ = 0;
  std::array<std::uint32_t, 8> state_{};
};

std::string to_hex(const std::array<std::uint8_t, 32>& hash) {
  static constexpr char kHex[] = "0123456789abcdef";
  std::string out(64, '0');
  for (int i = 0; i < 32; ++i) {
    out[i * 2] = kHex[(hash[i] >> 4) & 0xf];
    out[i * 2 + 1] = kHex[hash[i] & 0xf];
  }
  return out;
}

}  // namespace

std::string sha256_file(const std::filesystem::path& path) {
  std::ifstream in(path, std::ios::binary);
  if (!in) {
    throw std::runtime_error("cannot open file for hashing: " + path.string());
  }
  Sha256 hasher;
  std::vector<char> buf(1 << 16);
  while (in) {
    in.read(buf.data(), static_cast<std::streamsize>(buf.size()));
    const auto n = in.gcount();
    if (n > 0) {
      hasher.update(reinterpret_cast<const std::uint8_t*>(buf.data()), static_cast<std::size_t>(n));
    }
  }
  return to_hex(hasher.digest());
}

FastFingerprint fast_fingerprint(const std::filesystem::path& path) {
  FastFingerprint fp;
  fp.size_bytes = static_cast<std::uint64_t>(std::filesystem::file_size(path));
  std::ifstream in(path, std::ios::binary);
  if (!in) {
    throw std::runtime_error("cannot open file for fingerprint: " + path.string());
  }
  constexpr std::size_t kChunk = 64 * 1024;
  std::vector<std::uint8_t> head(kChunk);
  in.read(reinterpret_cast<char*>(head.data()), static_cast<std::streamsize>(kChunk));
  const auto head_n = static_cast<std::size_t>(in.gcount());
  head.resize(head_n);

  std::vector<std::uint8_t> tail;
  if (fp.size_bytes > kChunk) {
    in.clear();
    in.seekg(static_cast<std::streamoff>(fp.size_bytes - kChunk), std::ios::beg);
    tail.resize(kChunk);
    in.read(reinterpret_cast<char*>(tail.data()), static_cast<std::streamsize>(kChunk));
    tail.resize(static_cast<std::size_t>(in.gcount()));
  }

  Sha256 hasher;
  hasher.update(head.data(), head.size());
  if (!tail.empty()) hasher.update(tail.data(), tail.size());
  // Mix size into fingerprint string via hashing size bytes too.
  const auto size_le = fp.size_bytes;
  std::uint8_t size_bytes[8];
  for (int i = 0; i < 8; ++i) size_bytes[i] = static_cast<std::uint8_t>((size_le >> (8 * i)) & 0xff);
  hasher.update(size_bytes, 8);
  fp.partial_sha256 = to_hex(hasher.digest());
  return fp;
}

}  // namespace kedov::core
