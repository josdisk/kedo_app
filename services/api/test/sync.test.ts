import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { groupTakesAndAngles } from "../src/modules/sync/sync.grouping";

async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();
  return app;
}

const headers = {
  "x-kedov-user-id": "user_demo",
  "x-kedov-org-id": "org_demo",
};

test("grouping keeps simultaneous angles in one take", () => {
  const { takes, angles } = groupTakesAndAngles([
    { asset_id: "a", recorded_at_ms: 1000 },
    { asset_id: "b", recorded_at_ms: 1500 },
    { asset_id: "c", recorded_at_ms: 100_000 },
  ]);
  assert.equal(takes.length, 2);
  const ta = angles.find((x) => x.asset_id === "a")!.take_id;
  const tb = angles.find((x) => x.asset_id === "b")!.take_id;
  const tc = angles.find((x) => x.asset_id === "c")!.take_id;
  assert.equal(ta, tb);
  assert.notEqual(ta, tc);
});

test("sync session create, list, override, tenant isolation", async () => {
  const app = await createApp();
  const server = app.getHttpServer();
  const projectId = "proj_demo_music";

  const created = await request(server)
    .post(`/v1/projects/${projectId}/sync-jobs`)
    .set(headers)
    .send({
      master_asset_id: "master_wav",
      sample_rate: 8000,
      clips: [
        {
          asset_id: "cam_a",
          camera_label: "A",
          recorded_at_ms: 1_000_000,
          sample_offset: 400,
          confidence: 0.9,
        },
        {
          asset_id: "cam_b",
          camera_label: "B",
          recorded_at_ms: 1_001_000,
          sample_offset: 402,
          confidence: 0.85,
        },
        {
          asset_id: "cam_a_retake",
          camera_label: "A",
          recorded_at_ms: 4_000_000,
          sample_offset: 400,
          confidence: 0.6,
          ambiguous: true,
          note: "chorus ambiguity",
          alternates: [
            { sample_offset: 400, confidence: 0.6, peak_correlation: 0.7, note: "primary" },
            { sample_offset: 5000, confidence: 0.58, peak_correlation: 0.68, note: "alternate" },
          ],
        },
      ],
    })
    .expect(201);

  assert.equal(created.body.takes.length, 2);
  assert.equal(created.body.algorithm_version, "kedov-sync-ncc-1.0");
  const amb = created.body.alignments.find((a: { asset_id: string }) => a.asset_id === "cam_a_retake");
  assert.equal(amb.ambiguous, true);
  assert.ok(amb.confidence <= 0.85);

  const listed = await request(server)
    .get(`/v1/projects/${projectId}/sync-sessions`)
    .set(headers)
    .expect(200);
  assert.ok(listed.body.some((s: { session_id: string }) => s.session_id === created.body.session_id));

  const overridden = await request(server)
    .post(`/v1/sync-alignments/${created.body.session_id}/override`)
    .set(headers)
    .send({ asset_id: "cam_a_retake", sample_offset: 410, note: "manual slip" })
    .expect(201);
  const al = overridden.body.alignments.find((a: { asset_id: string }) => a.asset_id === "cam_a_retake");
  assert.equal(al.user_override, true);
  assert.equal(al.sample_offset, 410);
  assert.equal(al.ambiguous, false);

  await request(server)
    .get(`/v1/sync-sessions/${created.body.session_id}`)
    .set({ "x-kedov-user-id": "x", "x-kedov-org-id": "org_other" })
    .expect(403);

  await app.close();
});

test("attach fingerprint candidates beyond NCC (SYN-002)", async () => {
  const app = await createApp();
  const server = app.getHttpServer();

  const res = await request(server)
    .post(`/v1/sync-alignments/sync_demo_music/fingerprint`)
    .set(headers)
    .send({
      asset_id: "asset_cam_b_t1",
      algorithm_version: "kedov-fp-bands-onset-1.0",
      landmark_count_ref: 42,
      landmark_count_query: 38,
      candidates: [
        { sample_offset: 4810, score: 0.55, vote_count: 22, note: "landmark vote" },
        { sample_offset: 5200, score: 0.2, vote_count: 8, note: "landmark vote" },
      ],
      ambiguous: false,
      note: "fingerprint landmark match",
    })
    .expect(201);

  const al = res.body.alignments.find(
    (a: { asset_id: string }) => a.asset_id === "asset_cam_b_t1",
  );
  assert.ok(al?.fingerprint);
  assert.equal(al.fingerprint.algorithm_version, "kedov-fp-bands-onset-1.0");
  assert.equal(al.sample_offset, 4810);
  assert.equal(al.fingerprint.candidates.length, 2);
  assert.ok(al.alternates.length >= 1);

  await app.close();
});

test("attach drift map builds piecewise affine segments (SYN-005)", async () => {
  const app = await createApp();
  const server = app.getHttpServer();

  const drifted = await request(server)
    .post(`/v1/sync-alignments/sync_demo_music/drift`)
    .set(headers)
    .send({
      asset_id: "asset_cam_a_t1",
      anchors: [
        { source_sample: 0, master_sample: 100, confidence: 0.95 },
        { source_sample: 48000, master_sample: 48200, confidence: 0.93 },
      ],
    })
    .expect(201);

  const al = drifted.body.alignments.find(
    (a: { asset_id: string }) => a.asset_id === "asset_cam_a_t1",
  );
  assert.ok(al?.drift_map);
  assert.equal(al.drift_map.has_drift, true);
  assert.equal(al.drift_map.segments[0].slope_num, 481);
  assert.equal(al.drift_map.segments[0].slope_den, 480);

  await app.close();
});
