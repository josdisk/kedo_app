-- Milestone 2: take-aware sync persistence (SYN-012).

CREATE TABLE sync_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  master_asset_id TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  sample_rate INTEGER NOT NULL CHECK (sample_rate > 0),
  fps_num BIGINT NOT NULL CHECK (fps_num > 0),
  fps_den BIGINT NOT NULL CHECK (fps_den > 0),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sync_sessions_project_idx ON sync_sessions(project_id, updated_at DESC);

CREATE TABLE sync_alignments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sync_sessions(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL,
  take_id TEXT NOT NULL,
  angle_id TEXT NOT NULL,
  sample_offset BIGINT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  ambiguous BOOLEAN NOT NULL DEFAULT false,
  user_override BOOLEAN NOT NULL DEFAULT false,
  note TEXT NOT NULL DEFAULT '',
  alternates JSONB NOT NULL DEFAULT '[]',
  UNIQUE(session_id, asset_id)
);
