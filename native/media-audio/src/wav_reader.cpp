#include "kedov/audio/wav_reader.hpp"

#include <cstring>
#include <fstream>
#include <stdexcept>

namespace kedov::audio {
namespace {

struct RiffHeader {
  char riff[4];
  std::uint32_t size;
  char wave[4];
};

struct ChunkHeader {
  char id[4];
  std::uint32_t size;
};

struct FmtChunk {
  std::uint16_t audio_format;
  std::uint16_t num_channels;
  std::uint32_t sample_rate;
  std::uint32_t byte_rate;
  std::uint16_t block_align;
  std::uint16_t bits_per_sample;
};

}  // namespace

WavAudio read_wav_pcm16(const std::string& path) {
  std::ifstream in(path, std::ios::binary);
  if (!in) {
    throw std::runtime_error("cannot open wav: " + path);
  }

  RiffHeader riff{};
  in.read(reinterpret_cast<char*>(&riff), sizeof(riff));
  if (std::strncmp(riff.riff, "RIFF", 4) != 0 || std::strncmp(riff.wave, "WAVE", 4) != 0) {
    throw std::runtime_error("not a RIFF/WAVE file: " + path);
  }

  FmtChunk fmt{};
  bool have_fmt = false;
  std::vector<char> data_bytes;

  while (in && !in.eof()) {
    ChunkHeader chunk{};
    in.read(reinterpret_cast<char*>(&chunk), sizeof(chunk));
    if (!in) break;
    if (std::strncmp(chunk.id, "fmt ", 4) == 0) {
      if (chunk.size < sizeof(FmtChunk)) {
        throw std::runtime_error("fmt chunk too small");
      }
      in.read(reinterpret_cast<char*>(&fmt), sizeof(fmt));
      if (chunk.size > sizeof(FmtChunk)) {
        in.seekg(chunk.size - sizeof(FmtChunk), std::ios::cur);
      }
      have_fmt = true;
    } else if (std::strncmp(chunk.id, "data", 4) == 0) {
      data_bytes.resize(chunk.size);
      in.read(data_bytes.data(), chunk.size);
    } else {
      in.seekg(chunk.size, std::ios::cur);
    }
  }

  if (!have_fmt) {
    throw std::runtime_error("missing fmt chunk");
  }
  if (fmt.audio_format != 1 || fmt.bits_per_sample != 16) {
    throw std::runtime_error("only PCM16 WAV supported in R0 sync prototype");
  }
  if (fmt.num_channels < 1) {
    throw std::runtime_error("invalid channel count");
  }

  const auto sample_count = data_bytes.size() / (sizeof(std::int16_t) * fmt.num_channels);
  WavAudio out;
  out.sample_rate = static_cast<std::int32_t>(fmt.sample_rate);
  out.channels = static_cast<std::int16_t>(fmt.num_channels);
  out.mono.resize(sample_count);
  const auto* samples = reinterpret_cast<const std::int16_t*>(data_bytes.data());
  for (std::size_t i = 0; i < sample_count; ++i) {
    float sum = 0.f;
    for (int c = 0; c < fmt.num_channels; ++c) {
      sum += static_cast<float>(samples[i * fmt.num_channels + c]) / 32768.f;
    }
    out.mono[i] = sum / static_cast<float>(fmt.num_channels);
  }
  return out;
}

}  // namespace kedov::audio
