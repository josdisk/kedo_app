import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProxyFfmpegArgv,
  describeProxyMapping,
  proxyScaleFilter,
} from "./proxy-encode.js";

test("proxyScaleFilter clamps and formats", () => {
  assert.equal(proxyScaleFilter(720), "scale=-2:720");
  assert.equal(proxyScaleFilter(50), "scale=-2:120");
  assert.equal(proxyScaleFilter(99999), "scale=-2:4320");
});

test("buildProxyFfmpegArgv never writes in-place", () => {
  const argv = buildProxyFfmpegArgv(
    {
      source_path: "/media/cam_a.mov",
      output_path: "/cache/proxies/cam_a_720.mp4",
      target_height: 720,
    },
    "/opt/bin/ffmpeg",
  );
  assert.equal(argv[0], "/opt/bin/ffmpeg");
  assert.ok(argv.includes("-i"));
  assert.equal(argv[argv.indexOf("-i") + 1], "/media/cam_a.mov");
  assert.equal(argv[argv.indexOf("-vf") + 1], "scale=-2:720");
  assert.equal(argv[argv.indexOf("-c:v") + 1], "mpeg4");
  assert.equal(argv.at(-1), "/cache/proxies/cam_a_720.mp4");
  assert.notEqual(argv[argv.indexOf("-i") + 1], argv.at(-1));
});

test("buildProxyFfmpegArgv rejects identical paths", () => {
  assert.throws(
    () =>
      buildProxyFfmpegArgv({
        source_path: "/same.mov",
        output_path: "/same.mov",
      }),
    /must differ/,
  );
});

test("describeProxyMapping preserves source timebase policy", () => {
  const mapping = describeProxyMapping({
    source_path: "/a.mov",
    output_path: "/b.mp4",
    target_height: 540,
  });
  assert.equal(mapping.timebase_policy, "preserve_source");
  assert.equal(mapping.scale_filter, "scale=-2:540");
  assert.equal(mapping.target_height, 540);
});
